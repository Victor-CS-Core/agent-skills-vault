import DOMPurify from "dompurify";
import { marked } from "marked";
import type { Skill, SourceType } from "../types/skill";

marked.setOptions({});

export function normalizeSkill(skill: Partial<Skill>): Skill {
  return {
    id: skill.id || crypto.randomUUID(),
    name: skill.name || "unnamed-skill",
    description: skill.description || "",
    category: skill.category || "misc",
    source: skill.source || "manual",
    sourceType: (skill.sourceType as SourceType) || "manual",
    skillPath: skill.skillPath || "",
    rawUrl: skill.rawUrl || "",
    body: skill.body || "",
    addedAt: skill.addedAt || new Date().toISOString(),
  };
}

export function skillKey(skill: Partial<Skill>) {
  return `${(skill.name ?? "").trim().toLowerCase()}::${(skill.source ?? "").trim().toLowerCase()}`;
}

export function parseFrontmatter(raw: string) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {} as Record<string, string>, body: raw.trim() };

  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  return { fm, body: m[2].trim() };
}

export function safeExternalUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

export function renderMarkdownSafe(markdown: string) {
  const html = marked.parse(markdown || "") as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script"],
  });
}
