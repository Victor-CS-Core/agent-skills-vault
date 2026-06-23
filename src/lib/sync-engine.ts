import type { Skill } from "../types/skill";
import { normalizeSkill, skillKey } from "./skill-utils";

export type SkillRepositoryAdapter = {
  getAllSkills: () => Promise<Skill[]>;
  replaceAllSkills: (skills: Skill[]) => Promise<void>;
};

export type CloudSkillsAdapter = {
  fetchCloudSkills: () => Promise<Skill[]>;
  upsertCloudSkills: (skills: Skill[]) => Promise<void>;
  deleteCloudSkillsByKeys: (skillKeys: string[]) => Promise<void>;
};

export type SyncPlan = {
  replaceLocalWith: Skill[];
  upsertCloud: Skill[];
  deleteCloudKeys: string[];
};

export type RunSyncEngineOptions = {
  pendingDeleteKeys?: string[];
};

export type SyncEngineResult = {
  mergedSkills: Skill[];
  syncPlan: SyncPlan;
};

export function mergeSkillsByLatest(localSkills: Skill[], remoteSkills: Skill[]) {
  const merged = new Map<string, Skill>();

  for (const skill of remoteSkills) {
    merged.set(skillKey(skill), skill);
  }

  for (const skill of localSkills) {
    const key = skillKey(skill);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, skill);
      continue;
    }

    const localTime = new Date(skill.addedAt).getTime();
    const remoteTime = new Date(current.addedAt).getTime();
    if (localTime > remoteTime) {
      merged.set(key, skill);
    }
  }

  return [...merged.values()];
}

export function createSyncPlan(
  localSkills: Skill[],
  remoteSkills: Skill[],
  options: RunSyncEngineOptions = {},
): SyncPlan {
  const pendingDeleteKeys = new Set(options.pendingDeleteKeys ?? []);
  const remoteWithoutPendingDeletes = remoteSkills.filter(
    (skill) => !pendingDeleteKeys.has(skillKey(skill)),
  );

  const replaceLocalWith = mergeSkillsByLatest(
    localSkills,
    remoteWithoutPendingDeletes,
  );

  const remoteByKey = new Map<string, Skill>();
  for (const skill of remoteWithoutPendingDeletes) {
    remoteByKey.set(skillKey(skill), skill);
  }

  const upsertCloud: Skill[] = [];
  for (const localSkill of localSkills) {
    const key = skillKey(localSkill);
    const remoteSkill = remoteByKey.get(key);

    if (!remoteSkill) {
      upsertCloud.push(localSkill);
      continue;
    }

    const localTime = new Date(localSkill.addedAt).getTime();
    const remoteTime = new Date(remoteSkill.addedAt).getTime();
    if (localTime > remoteTime) {
      upsertCloud.push(localSkill);
    }
  }

  return {
    replaceLocalWith,
    upsertCloud,
    deleteCloudKeys: [...pendingDeleteKeys],
  };
}

export async function runSyncEngine(
  repository: SkillRepositoryAdapter,
  cloud: CloudSkillsAdapter,
  options: RunSyncEngineOptions = {},
): Promise<SyncEngineResult> {
  const localSkills = (await repository.getAllSkills()).map(normalizeSkill);
  const remoteSkills = await cloud.fetchCloudSkills();

  const syncPlan = createSyncPlan(localSkills, remoteSkills, options);

  await repository.replaceAllSkills(syncPlan.replaceLocalWith);
  await cloud.upsertCloudSkills(syncPlan.upsertCloud);
  await cloud.deleteCloudSkillsByKeys(syncPlan.deleteCloudKeys);

  return { mergedSkills: syncPlan.replaceLocalWith, syncPlan };
}
