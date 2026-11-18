import { View, div } from "gpui-kit";
import { v_flex, h_flex, Scrollbar } from "gpui-base";
import { exec, theme, checking, notify, shared } from "herdr";
import { loadAuthHeader, fetchSections, MissingCredentials } from "./jira.js";
import { jiraSite, SITE_VAR } from "./localrc.js";

const REFRESH_MS = 180000;
const ROW_HEIGHT = 44;
const SETUP_HINT = "security add-generic-password -U -s herdr-jira -a <email> -w";
const MRS_SHARED_KEY = "gitlab.mrs";

// Open MRs published by the gitlab-mrs panel, indexed by the ticket keys they mention.
function mrsByIssue() {
  const rows = shared(MRS_SHARED_KEY);
  const index = {};
  for (const mr of Array.isArray(rows) ? rows : []) {
    for (const k of Array.isArray(mr?.jiraKeys) ? mr.jiraKeys : []) index[k] = [...(index[k] ?? []), mr];
  }
  return index;
}
const CATEGORY_COLOR = { indeterminate: "working", new: "muted", done: "ansi2" };
const PRIORITY_COLOR = { Highest: "ansi1", High: "blocked", Medium: "muted", Low: "dim", Lowest: "dim" };

function ago(iso) {
  const ms = Date.now() - Date.parse(iso ?? "");
  if (!Number.isFinite(ms)) return "";
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export default class JiraIssues extends View {
  init(_props, cx) {
    this.sections = [];
    this.collapsed = {};
    this.error = null;
    this.needsSetup = false;
    this.loading = false;
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.site = this.site ?? await jiraSite();
        if (!this.site) throw new MissingCredentials(`Set ${SITE_VAR} in ~/.localrc`);
        this.auth = this.auth ?? await loadAuthHeader();
        this.sections = await fetchSections(this.site, this.auth);
        this.error = null;
        this.needsSetup = false;
      } catch (e) {
        this.needsSetup = e instanceof MissingCredentials;
        if (this.needsSetup) { this.auth = null; this.site = null; }
        this.error = String(e?.message ?? e);
      } finally {
        this.loading = false;
        cx.notify();
      }
    });
  }

  openUrl(url) {
    if (!url.startsWith("https://")) return;
    exec("open", [url]).catch((e) => notify({ title: "Could not open issue", body: String(e), level: "error" }));
  }

  header(t) {
    const total = this.sections.reduce((n, s) => n + s.rows.length, 0);
    return h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
      .child(div().font_semibold().child("Jira"))
      .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(String(total)))
      .child(div().flex_1())
      .child(div().id("jira-refresh").w(24).h(24).flex().items_center().justify_center().rounded(6).cursor_pointer()
        .text_color(this.loading ? t.accent : t.muted).hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => this.refresh(cx))
        .child(this.loading ? div().frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90) : div().child("↻")));
  }

  sectionHeader(section, t) {
    const closed = Boolean(this.collapsed[section.id]);
    return h_flex().id(`jira-sec-${section.id}`).h(28).flex_none().px(8).gap(6).items_center().cursor_pointer()
      .text_size(11).text_color(t.muted).hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => { this.collapsed = { ...this.collapsed, [section.id]: !closed }; cx.notify(); })
      .child(div().w(10).child(closed ? "▸" : "▾"))
      .child(div().w(8).h(8).rounded(4).bg(t[CATEGORY_COLOR[section.category] ?? "dim"]))
      .child(div().font_semibold().child(section.title))
      .child(div().text_color(t.dim).child(String(section.rows.length)));
  }

  // Stopping the press keeps the row's own click (open the issue) from firing too.
  mrChip(mr, issueKey, t) {
    return div().id(`mr-chip-${issueKey}-${mr.key}`).flex_none().px(4).rounded(4).text_color(t.accent)
      .cursor_pointer().hover((s) => s.bg(t.raised))
      .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); this.openUrl(String(mr.url ?? "")); })
      .child(`!${mr.iid}`);
  }

  row(issue, t, mrs) {
    return v_flex().id(`jira-${issue.key}`).h(ROW_HEIGHT).flex_none().px(8).justify_center().gap(2).rounded(7)
      .cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => this.openUrl(issue.url))
      .child(div().min_w(0).truncate().child(issue.summary))
      .child(h_flex().gap(6).min_w(0).text_size(11).text_color(t.dim)
        .child(div().flex_none().text_color(t.accent).child(issue.key))
        .child(div().min_w(0).truncate().child(issue.type))
        .children(mrs.map((mr) => this.mrChip(mr, issue.key, t)))
        .child(div().flex_1())
        .when(Boolean(issue.priority), (e) => e.child(div().flex_none().text_color(t[PRIORITY_COLOR[issue.priority] ?? "dim"]).child(issue.priority)))
        .child(div().flex_none().child(ago(issue.updatedAt))));
  }

  setup(t) {
    return v_flex().p(10).gap(6).text_size(11).text_color(t.muted)
      .child(div().child(`1. Put your Jira site in ~/.localrc:`))
      .child(div().p(6).rounded(6).bg(t.raised).text_color(t.foreground).child(`export ${SITE_VAR}=https://<site>.atlassian.net`))
      .child(div().child("2. Store a Jira API token (id.atlassian.com → Security → API tokens) in the Keychain from a real terminal, then press ↻:"))
      .child(div().p(6).rounded(6).bg(t.raised).text_color(t.foreground).child(SETUP_HINT));
  }

  body(t) {
    if (this.needsSetup) return [this.setup(t)];
    const items = [];
    const mrs = mrsByIssue();
    for (const section of this.sections) {
      items.push(this.sectionHeader(section, t));
      if (!this.collapsed[section.id]) for (const issue of section.rows) items.push(this.row(issue, t, mrs[issue.key] ?? []));
    }
    if (!items.length) items.push(div().p(8).text_color(t.dim).child(this.loading ? "Loading issues…" : "No open issues"));
    return items;
  }

  render(cx) {
    const t = theme();
    return v_flex().id("jira-issues").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background)
      .border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(this.header(t))
      .when(Boolean(this.error), (e) => e.child(div().px(12).py(6).text_size(11).text_color(t.ansi1).border_b(1).border_color(t.border).child(this.error)))
      .child(div().flex_1().min_h(0).relative()
        .child(v_flex().id("jira-list").absolute().inset_0().overflow_y_scroll().p(6).children(this.body(t)))
        .child(Scrollbar.vertical("jira-list").absolute().inset_0()));
  }
}
