import { storeAdd } from "./storage";
import { parseFrontmatter } from "./skill-utils";
import type { ImportResult, ParsedRepo, Skill } from "../types/skill";

export function parseRepoUrl(input: string): ParsedRepo {
  const u = new URL(input);
  const hostname = u.hostname.startsWith("www.") ? u.hostname.slice(4) : u.hostname;

  if (hostname === "skills.sh") {
    const p = u.pathname.split("/").filter(Boolean);
    if (p.length < 2) throw new Error("Invalid skills.sh URL");
    return { owner: p[0], repo: p[1], branch: "main" };
  }

  if (hostname !== "github.com") {
    throw new Error("Only github.com and skills.sh URLs are supported");
  }

  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid GitHub URL");

  const [owner, repo] = parts;
  let branch = "main";
  let skillPath: string | undefined;

  if (parts[2] === "blob" && parts.length >= 5) {
    branch = parts[3];
    skillPath = parts.slice(4).join("/");
  } else if (parts[2] === "tree" && parts.length >= 5) {
    branch = parts[3];
    skillPath = parts.slice(4).join("/");
  }

  return { owner, repo: repo.replace(/\.git$/, ""), branch, skillPath };
}

export async function fetchRaw(
  owner: string,
  repo: string,
  path: string,
  branch: string,
) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return { text: await res.text(), rawUrl: url };
}

function hydrateSkill(
  owner: string,
  repo: string,
  skillPath: string,
  rawUrl: string,
  fm: Record<string, string>,
  body: string,
): Omit<Skill, "id" | "addedAt"> {
  const name = fm.name || skillPath.split("/").slice(-2, -1)[0] || "unknown-skill";
  const desc = fm.description || "";
  const category = fm.category || "misc";
  return {
    name,
    description: desc,
    category,
    source: `${owner}/${repo}`,
    sourceType: "github",
    skillPath,
    rawUrl,
    body,
  };
}

export async function importSingleSkill(
  owner: string,
  repo: string,
  skillPath: string,
  branch: string,
): Promise<ImportResult> {
  const { text, rawUrl } = await fetchRaw(owner, repo, skillPath, branch);
  const { fm, body } = parseFrontmatter(text);
  const skill = hydrateSkill(owner, repo, skillPath, rawUrl, fm, body);
  const record = await storeAdd(skill);
  return { ok: true, record };
}

export async function importFromRepo(
  owner: string,
  repo: string,
  filter: string,
  branch: string,
): Promise<ImportResult[]> {
  const api = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`Could not read ${owner}/${repo}@${branch}`);
  const treeData = (await res.json()) as {
    tree?: { path: string; type: string }[];
  };
  const tree = treeData.tree || [];

  const targets = tree
    .filter((n) => n.type === "blob" && n.path.endsWith("SKILL.md"))
    .filter((n) =>
      filter ? n.path.toLowerCase().includes(filter.trim().toLowerCase()) : true,
    )
    .map((n) => n.path);

  const results: ImportResult[] = [];
  for (const path of targets) {
    try {
      const { text, rawUrl } = await fetchRaw(owner, repo, path, branch);
      const { fm, body } = parseFrontmatter(text);
      const skill = hydrateSkill(owner, repo, path, rawUrl, fm, body);
      const record = await storeAdd(skill);
      results.push({ ok: true, record });
    } catch (error) {
      results.push({ ok: false, error: (error as Error).message });
    }
  }
  return results;
}
