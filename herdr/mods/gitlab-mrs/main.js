import { View, div } from "gpui-kit";
import { v_flex, h_flex, Scrollbar } from "gpui-base";
import { exec, theme, checking, notify, setBadge, setShared, nextCommand } from "herdr";
import { currentUsername, fetchSections } from "./gitlab.js";
import { jiraSite } from "./localrc.js";

const MOD_NAME = "gitlab-mrs";
const SHARED_KEY = "gitlab.mrs";
const REFRESH_MS = 120000;
const ROW_HEIGHT = 46;
const MAX_TOASTS = 3;
const SEEN_KEY = "seen-reviews";

// The chip already shows the key: drop a leading "PROJ-123: " from the title.
function titleWithoutKeys(mr) {
  const match = /^([A-Z][A-Z0-9]+-\d+)\s*[:\-–]\s*/.exec(mr.title);
  return match && mr.jiraKeys.includes(match[1]) ? mr.title.slice(match[0].length) || mr.title : mr.title;
}

// null on first run: the first load sets the baseline instead of toasting every open review.
function loadSeen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null");
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function saveSeen(keys) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(keys)); } catch { /* per-copy convenience only */ }
}

const MERGE_STATUS = {
  mergeable: { label: "ready", color: "ansi2" },
  not_approved: { label: "needs approval", color: "muted" },
  ci_still_running: { label: "CI running", color: "working" },
  ci_must_pass: { label: "CI must pass", color: "ansi1" },
  discussions_not_resolved: { label: "open threads", color: "blocked" },
  conflict: { label: "conflict", color: "ansi1" },
  need_rebase: { label: "needs rebase", color: "blocked" },
  draft_status: { label: "draft", color: "dim" },
  checking: { label: "checking", color: "dim" },
};

const PIPELINE_COLOR = {
  success: "ansi2", failed: "ansi1", running: "working", pending: "working",
  created: "working", manual: "ansi3", canceled: "dim", skipped: "dim",
};

function ago(iso) {
  const ms = Date.now() - Date.parse(iso ?? "");
  if (!Number.isFinite(ms)) return "";
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export default class GitlabMrs extends View {
  init(_props, cx) {
    this.sections = [];
    this.collapsed = {};
    this.error = null;
    this.loading = false;
    this.fetchedAt = null;
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
    this.listen(cx);
  }

  // Toast clicks arrive as "open-<project>-<iid>" (see announceReviews).
  listen(cx) {
    cx.spawn(async () => {
      for (;;) {
        const command = await nextCommand();
        const mr = this.allRows().find((m) => m.command === command);
        if (mr) this.openUrl(mr.url);
        else if (command !== "focus") notify({ title: "GitLab MRs", body: `Unknown or stale command: ${command}`, level: "warning" });
      }
    });
  }

  allRows() {
    return this.sections.flatMap((s) => s.rows);
  }

  // Lets other mods (the Jira panel) show the MRs for a ticket.
  publish() {
    const seen = new Set();
    const rows = this.allRows().filter((m) => !seen.has(m.key) && seen.add(m.key))
      .map(({ key, iid, project, url, jiraKeys }) => ({ key, iid, project, url, jiraKeys }));
    setShared(SHARED_KEY, rows);
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.username = this.username ?? await currentUsername();
        this.jiraSite = this.jiraSite ?? await jiraSite();
        this.sections = await fetchSections(this.username);
        this.fetchedAt = new Date().toISOString();
        this.error = null;
        this.announceReviews();
        this.publish();
      } catch (e) {
        this.error = String(e?.message ?? e);
      } finally {
        this.loading = false;
        cx.notify();
      }
    });
  }

  // Dock badge = reviews waiting on you; a toast for each review request not seen before.
  announceReviews() {
    const reviews = this.sections.find((s) => s.id === "review")?.rows ?? [];
    setBadge(reviews.length ? String(reviews.length) : null);
    const seen = loadSeen();
    const fresh = seen ? reviews.filter((mr) => !seen.includes(mr.key)) : [];
    for (const mr of fresh.slice(0, MAX_TOASTS)) {
      notify({
        title: `Review requested: ${mr.project} !${mr.iid}`, body: `@${mr.author}: ${mr.title}`, level: "info", timeout: 10000,
        action: { name: `${MOD_NAME}.${mr.command}` },
      });
    }
    saveSeen(reviews.map((mr) => mr.key));
  }

  async close() { setBadge(null); }

  openUrl(url) {
    if (!url.startsWith("https://")) return;
    exec("open", [url]).catch((e) => notify({ title: "Could not open MR", body: String(e), level: "error" }));
  }

  header(t, cx) {
    const total = this.sections.reduce((n, s) => n + s.rows.length, 0);
    return h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
      .child(div().font_semibold().child("Merge requests"))
      .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(String(total)))
      .child(div().flex_1())
      .when(Boolean(this.fetchedAt) && !this.loading, (e) => e.child(div().text_size(10).text_color(t.dim).child(ago(this.fetchedAt) === "0m" ? "now" : ago(this.fetchedAt))))
      .child(div().id("mrs-refresh").w(24).h(24).flex().items_center().justify_center().rounded(6).cursor_pointer()
        .text_color(this.loading ? t.accent : t.muted).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => this.refresh(cx))
        .child(this.loading ? div().frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90) : div().child("↻")));
  }

  sectionHeader(section, t) {
    const closed = Boolean(this.collapsed[section.id]);
    return h_flex().id(`mrs-sec-${section.id}`).h(28).flex_none().px(8).gap(6).items_center().cursor_pointer()
      .text_size(11).text_color(t.muted).hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => { this.collapsed = { ...this.collapsed, [section.id]: !closed }; cx.notify(); })
      .child(div().w(10).child(closed ? "▸" : "▾"))
      .child(div().font_semibold().child(section.title))
      .child(div().text_color(t.dim).child(String(section.rows.length)));
  }

  status(mr, t) {
    const s = MERGE_STATUS[mr.mergeStatus];
    if (mr.draft) return div().text_color(t.dim).child("draft");
    return s ? div().text_color(t[s.color]).child(s.label) : div().text_color(t.dim).child(mr.mergeStatus.replace(/_/g, " "));
  }

  pipelineDot(mr, t) {
    const color = t[PIPELINE_COLOR[mr.pipeline] ?? "dim"];
    const dot = div().w(8).h(8).flex_none().rounded(4).bg(color);
    const live = mr.pipeline === "running" || mr.pipeline === "pending";
    return live ? dot.loop("opacity", { from: 0.35, to: 1, period: 1200 }) : dot;
  }

  // Stopping the press keeps the row's own click (open the MR) from firing too.
  jiraChip(jiraKey, rowId, t) {
    return div().id(`jira-chip-${rowId}-${jiraKey}`).flex_none().px(4).rounded(4).text_color(t.accent)
      .cursor_pointer().hover((s) => s.bg(t.raised))
      .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); this.openUrl(`${this.jiraSite}/browse/${encodeURIComponent(jiraKey)}`); })
      .child(jiraKey);
  }

  row(mr, section, t) {
    return v_flex().id(`mr-${section.id}-${mr.key}`).h(ROW_HEIGHT).flex_none().px(8).justify_center().gap(2).rounded(7)
      .cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => this.openUrl(mr.url))
      .child(h_flex().gap(6).items_center().min_w(0)
        .child(this.pipelineDot(mr, t))
        .children(this.jiraSite ? mr.jiraKeys.map((k) => this.jiraChip(k, `${section.id}-${mr.key}`, t)) : [])
        .child(div().flex_1().min_w(0).truncate().text_color(mr.draft ? t.muted : t.foreground).child(titleWithoutKeys(mr))))
      .child(h_flex().gap(6).pl(16).min_w(0).text_size(11).text_color(t.dim)
        .child(div().min_w(0).truncate().child(`${mr.project} !${mr.iid}`))
        .when(section.id === "review" && Boolean(mr.author), (e) => e.child(div().flex_none().child(`@${mr.author}`)))
        .child(div().flex_1())
        .child(this.status(mr, t).flex_none())
        .when(mr.comments > 0, (e) => e.child(div().flex_none().child(`💬${mr.comments}`)))
        .child(div().flex_none().child(ago(mr.updatedAt))));
  }

  body(t) {
    const items = [];
    for (const section of this.sections) {
      items.push(this.sectionHeader(section, t));
      if (this.collapsed[section.id]) continue;
      if (!section.rows.length) items.push(div().px(26).pb(6).text_size(11).text_color(t.dim).child("None"));
      for (const mr of section.rows) items.push(this.row(mr, section, t));
    }
    if (!items.length) items.push(div().p(8).text_color(t.dim).child(this.loading ? "Loading merge requests…" : "No data yet"));
    return items;
  }

  render(cx) {
    const t = theme();
    return v_flex().id("gitlab-mrs").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background)
      .border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(this.header(t, cx))
      .when(Boolean(this.error), (e) => e.child(div().px(12).py(6).text_size(11).text_color(t.ansi1).border_b(1).border_color(t.border).child(this.error)))
      .child(div().flex_1().min_h(0).relative()
        .child(v_flex().id("mrs-list").absolute().inset_0().overflow_y_scroll().p(6).children(this.body(t)))
        .child(Scrollbar.vertical("mrs-list").absolute().inset_0()));
  }
}
