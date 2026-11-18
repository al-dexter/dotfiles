// GitLab data access through the user's own `glab` (host and auth come from its config).
import { exec } from "herdr";

const GLAB_CANDIDATES = ["glab", "/opt/homebrew/bin/glab", "/usr/local/bin/glab"];
const PER_PAGE = 50;
const API_TIMEOUT_MS = 20000;

let glabPath = null;

async function runGlab(args) {
  const candidates = glabPath ? [glabPath] : GLAB_CANDIDATES;
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const r = await exec(candidate, args, { timeout: API_TIMEOUT_MS });
      glabPath = candidate;
      return r;
    } catch (e) { lastError = e; }
  }
  throw new Error(`glab not found or not runnable: ${lastError}`);
}

async function api(path) {
  const r = await runGlab(["api", path]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout || `glab api ${path} failed`).trim());
  try { return JSON.parse(r.stdout); }
  catch { throw new Error(`glab api ${path}: response is not JSON`); }
}

export async function currentUsername() {
  const user = await api("user");
  if (typeof user?.username !== "string" || !user.username) throw new Error("glab api user: no username");
  return user.username;
}

function projectName(mr) {
  const full = mr.references?.full ?? "";
  const path = full.split("!")[0];
  return path.split("/").pop() || String(mr.project_id);
}

const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;

// Ticket keys from the title (`PROJ-123: ...`) and the branch (`proj-123-...`).
function jiraKeysOf(mr) {
  const text = `${mr.title ?? ""} ${String(mr.source_branch ?? "").toUpperCase()}`;
  return [...new Set(text.match(JIRA_KEY) ?? [])];
}

function toRow(mr, pipeline) {
  return {
    key: `${mr.project_id}!${mr.iid}`,
    command: `open-${mr.project_id}-${mr.iid}`,
    jiraKeys: jiraKeysOf(mr),
    iid: mr.iid,
    title: String(mr.title ?? ""),
    url: String(mr.web_url ?? ""),
    project: projectName(mr),
    draft: Boolean(mr.draft),
    mergeStatus: String(mr.detailed_merge_status ?? ""),
    comments: Number(mr.user_notes_count) || 0,
    updatedAt: mr.updated_at ?? null,
    author: mr.author?.username ?? "",
    pipeline: pipeline ?? null,
  };
}

// The list endpoint omits head_pipeline; the single-MR endpoint has it.
async function pipelineOf(mr) {
  try {
    const detail = await api(`projects/${mr.project_id}/merge_requests/${mr.iid}`);
    return detail?.head_pipeline?.status ?? null;
  } catch { return null; }
}

async function listMrs(query) {
  const list = await api(`merge_requests?state=opened&per_page=${PER_PAGE}&order_by=updated_at&${query}`);
  if (!Array.isArray(list)) throw new Error("merge_requests: unexpected response");
  const pipelines = await Promise.all(list.map(pipelineOf));
  return list.map((mr, i) => toRow(mr, pipelines[i]));
}

export async function fetchSections(username) {
  const user = encodeURIComponent(username);
  const [mine, review] = await Promise.all([
    listMrs("scope=created_by_me"),
    listMrs(`scope=all&reviewer_username=${user}`),
  ]);
  const mineKeys = new Set(mine.map((m) => m.key));
  return [
    { id: "review", title: "Review requested", rows: review.filter((m) => !mineKeys.has(m.key)) },
    { id: "mine", title: "Mine", rows: mine },
  ];
}
