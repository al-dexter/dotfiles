// Machine-specific values come from ~/.localrc (never committed), e.g.
//   export HERDR_JIRA_SITE=https://your-company.atlassian.net
import { readTextFile, home } from "herdr";

export const SITE_VAR = "HERDR_JIRA_SITE";
const SITE_PATTERN = /^https:\/\/[A-Za-z0-9.-]+$/;

export async function jiraSite() {
  const text = await readTextFile(`${home()}/.localrc`).catch(() => "");
  const match = new RegExp(`^\\s*(?:export\\s+)?${SITE_VAR}=["']?([^"'\\s#]+)`, "m").exec(text ?? "");
  const site = match?.[1]?.replace(/\/+$/, "");
  return site && SITE_PATTERN.test(site) ? site : null;
}
