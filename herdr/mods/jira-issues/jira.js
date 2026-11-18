// Jira Cloud data access. Credentials live in the macOS Keychain, never in this folder:
//   security add-generic-password -s herdr-jira -a <your-email> -w <api-token>
import { exec } from "herdr";

export const JQL = "assignee = currentUser() AND resolution = Unresolved AND statusCategory != Done AND issuetype != Epic ORDER BY updated DESC";
const KEYCHAIN_SERVICE = "herdr-jira";
const MAX_RESULTS = 50;
const FIELDS = ["summary", "status", "priority", "updated", "issuetype"];
const CATEGORY_ORDER = { indeterminate: 0, new: 1, done: 2 };

export class MissingCredentials extends Error {}

// The mod runtime has no TextEncoder/btoa: UTF-8 bytes via encodeURIComponent's %XX escapes.
function utf8Bytes(text) {
  const encoded = encodeURIComponent(text);
  const bytes = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "%") { bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(encoded.charCodeAt(i));
  }
  return bytes;
}

function base64(text) {
  const bytes = utf8Bytes(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? chars[n & 63] : "=";
  }
  return out;
}

export async function loadAuthHeader() {
  const meta = await exec("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE]);
  if (meta.code !== 0) throw new MissingCredentials(`No Keychain item "${KEYCHAIN_SERVICE}"`);
  const account = /"acct"<blob>="([^"]*)"/.exec(meta.stdout)?.[1];
  const secret = await exec("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"]);
  const token = secret.stdout.trim();
  if (!account) throw new MissingCredentials(`Keychain item "${KEYCHAIN_SERVICE}" has no account (your Atlassian email)`);
  if (secret.code !== 0) throw new MissingCredentials(`Could not read the token from Keychain item "${KEYCHAIN_SERVICE}"`);
  if (!token) throw new MissingCredentials(`The token in Keychain item "${KEYCHAIN_SERVICE}" is empty: re-add it from a real terminal with -U`);
  return `Basic ${base64(`${account}:${token}`)}`;
}

function toRow(site, issue) {
  const f = issue.fields ?? {};
  return {
    key: String(issue.key ?? ""),
    summary: String(f.summary ?? ""),
    status: String(f.status?.name ?? "Unknown"),
    category: String(f.status?.statusCategory?.key ?? "new"),
    priority: String(f.priority?.name ?? ""),
    type: String(f.issuetype?.name ?? ""),
    updatedAt: f.updated ?? null,
    url: `${site}/browse/${encodeURIComponent(String(issue.key ?? ""))}`,
  };
}

function groupByStatus(rows) {
  const groups = new Map();
  for (const row of rows) groups.set(row.status, [...(groups.get(row.status) ?? []), row]);
  return [...groups.entries()]
    .map(([status, items]) => ({ id: status, title: status, category: items[0].category, rows: items }))
    .sort((a, b) => (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9));
}

export async function fetchSections(site, auth) {
  const res = await fetch(`${site}/rest/api/3/search/jql`, {
    method: "POST",
    headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ jql: JQL, fields: FIELDS, maxResults: MAX_RESULTS }),
  });
  if (res.status === 401 || res.status === 403) throw new MissingCredentials(`Jira rejected the token (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`Jira search failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.issues)) throw new Error("Jira search: unexpected response");
  return groupByStatus(data.issues.map((issue) => toRow(site, issue)));
}
