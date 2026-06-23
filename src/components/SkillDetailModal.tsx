import { useEffect, useMemo, useState } from "react";
import {
  parseFrontmatter,
  renderMarkdownSafe,
  safeExternalUrl,
} from "../lib/skill-utils";
import type { Skill } from "../types/skill";

type SkillDetailModalProps = {
  skill: Skill;
  onClose: () => void;
};

type GitHubRawInfo = {
  owner: string;
  repo: string;
  branch: string;
};

type RelatedSkill = {
  name: string;
  description: string;
  rawUrl: string;
};

const relatedSkillCache = new Map<string, RelatedSkill[]>();

function parseGitHubRawUrl(rawUrl: string): GitHubRawInfo | null {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== "raw.githubusercontent.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    return {
      owner: parts[0],
      repo: parts[1],
      branch: parts[2],
    };
  } catch {
    return null;
  }
}

function extractSlashSkillRefs(text: string): string[] {
  const refs = new Set<string>();
  const regex = /\/(?:[a-z0-9][a-z0-9-]*)/gi;
  for (const match of text.matchAll(regex)) {
    refs.add(match[0].slice(1).toLowerCase());
  }
  return [...refs];
}

async function fetchRelatedSkills(
  sourceUrl: string,
  refs: string[],
): Promise<RelatedSkill[]> {
  const cached = relatedSkillCache.get(sourceUrl);
  if (cached) return cached;

  const info = parseGitHubRawUrl(sourceUrl);
  if (!info || refs.length === 0) return [];

  const treeRes = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/git/trees/${info.branch}?recursive=1`,
  );
  if (!treeRes.ok) return [];

  const treeData = (await treeRes.json()) as {
    tree?: { path: string; type: string }[];
  };

  const tree = (treeData.tree ?? []).filter((n) => n.type === "blob");
  const result: RelatedSkill[] = [];

  for (const ref of refs) {
    const match = tree.find(
      (n) =>
        n.path.endsWith("SKILL.md") &&
        (n.path.toLowerCase().endsWith(`/${ref}/SKILL.md`) ||
          n.path.toLowerCase().includes(`/${ref}/`)),
    );
    if (!match) continue;

    try {
      const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${match.path}`;
      const rawRes = await fetch(rawUrl);
      if (!rawRes.ok) continue;
      const markdown = await rawRes.text();
      const { fm, body } = parseFrontmatter(markdown);
      result.push({
        name: fm.name || ref,
        description: fm.description || body.split(/\r?\n/)[0] || "",
        rawUrl,
      });
    } catch {
      // ignore best-effort related-skill load failures
    }
  }

  relatedSkillCache.set(sourceUrl, result);
  return result;
}

export default function SkillDetailModal({
  skill,
  onClose,
}: SkillDetailModalProps) {
  const sourceUrl = safeExternalUrl(skill.rawUrl);
  const refs = useMemo(
    () => extractSlashSkillRefs(skill.body || ""),
    [skill.body],
  );
  const [relatedSkills, setRelatedSkills] = useState<RelatedSkill[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sourceUrl || refs.length === 0) {
        setRelatedSkills([]);
        return;
      }
      const loaded = await fetchRelatedSkills(sourceUrl, refs);
      if (!cancelled) setRelatedSkills(loaded);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, refs]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <h2>{skill.name}</h2>
          <button
            type="button"
            className="icon"
            onClick={onClose}
            aria-label="Close skill details"
          >
            ×
          </button>
        </div>
        <p className="detail-meta">
          {skill.source}
          {sourceUrl && (
            <>
              {" "}
              .{" "}
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                View source
              </a>
            </>
          )}
        </p>
        <div
          className="markdown"
          dangerouslySetInnerHTML={{
            __html: renderMarkdownSafe(skill.body || "*No content*"),
          }}
        />

        {relatedSkills.length > 0 && (
          <div className="markdown related-skills">
            <h3>Related Skills</h3>
            <ul>
              {relatedSkills.map((item) => (
                <li key={item.rawUrl}>
                  <a
                    href={item.rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.name}
                  </a>
                  {item.description ? `: ${item.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
