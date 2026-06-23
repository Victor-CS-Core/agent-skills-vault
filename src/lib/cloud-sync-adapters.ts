import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CLOUD_TABLE } from "./constants";
import { fromCloudRow, toCloudRow } from "./cloud";
import { storeGetAll, storeReplaceAll } from "./storage";
import { skillKey } from "./skill-utils";
import type { Skill } from "../types/skill";
import type { CloudSkillsAdapter, SkillRepositoryAdapter } from "./sync-engine";

export function createSkillRepositoryAdapter(): SkillRepositoryAdapter {
  return {
    getAllSkills: storeGetAll,
    replaceAllSkills: storeReplaceAll,
  };
}

export function createSupabaseCloudSkillsAdapter(
  client: SupabaseClient,
  user: User,
): CloudSkillsAdapter {
  return {
    async fetchCloudSkills() {
      const { data, error } = await client
        .from(CLOUD_TABLE)
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((row) => fromCloudRow(row as Record<string, unknown>));
    },

    async upsertCloudSkills(skills: Skill[]) {
      if (skills.length === 0) return;
      const payload = skills.map((skill) => toCloudRow(skill, user.id));
      const { error } = await client.from(CLOUD_TABLE).upsert(payload, {
        onConflict: "user_id,skill_key",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },

    async deleteCloudSkillsByKeys(skillKeys: string[]) {
      if (skillKeys.length === 0) return;
      const { error } = await client
        .from(CLOUD_TABLE)
        .delete()
        .eq("user_id", user.id)
        .in("skill_key", skillKeys);
      if (error) throw error;
    },
  };
}

export async function removeCloudSkillByKey(
  client: SupabaseClient,
  user: User,
  skill: Skill,
) {
  const { error } = await client
    .from(CLOUD_TABLE)
    .delete()
    .eq("user_id", user.id)
    .eq("skill_key", skillKey(skill));

  if (error) throw error;
}
