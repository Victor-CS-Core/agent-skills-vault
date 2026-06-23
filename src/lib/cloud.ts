import type { CloudConfig, Skill } from "../types/skill";
import { CLOUD_CFG_KEY, CLOUD_DIRTY_KEY } from "./constants";
import { normalizeSkill, skillKey } from "./skill-utils";

export function toCloudRow(skill: Skill, userId: string) {
  return {
    user_id: userId,
    skill_key: skillKey(skill),
    name: skill.name,
    description: skill.description,
    category: skill.category,
    source: skill.source,
    source_type: skill.sourceType,
    skill_path: skill.skillPath,
    raw_url: skill.rawUrl,
    body: skill.body,
    added_at: skill.addedAt,
  };
}

export function fromCloudRow(row: Record<string, unknown>): Skill {
  return normalizeSkill({
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    category: String(row.category ?? "misc"),
    source: String(row.source ?? "manual"),
    sourceType: String(row.source_type ?? "manual") as Skill["sourceType"],
    skillPath: String(row.skill_path ?? ""),
    rawUrl: String(row.raw_url ?? ""),
    body: String(row.body ?? ""),
    addedAt: String(row.added_at ?? new Date().toISOString()),
  });
}

export function loadCloudConfig(): CloudConfig {
  try {
    const raw = localStorage.getItem(CLOUD_CFG_KEY);
    if (!raw) return { url: "", anonKey: "" };
    const parsed = JSON.parse(raw) as Partial<CloudConfig>;
    return { url: (parsed.url || "").trim(), anonKey: (parsed.anonKey || "").trim() };
  } catch {
    return { url: "", anonKey: "" };
  }
}

export function hasPendingCloudChanges() {
  try {
    return localStorage.getItem(CLOUD_DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCloudDirty() {
  try {
    localStorage.setItem(CLOUD_DIRTY_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearCloudDirty() {
  try {
    localStorage.removeItem(CLOUD_DIRTY_KEY);
  } catch {
    // ignore
  }
}
