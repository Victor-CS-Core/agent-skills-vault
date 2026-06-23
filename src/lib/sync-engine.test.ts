import { describe, expect, it } from "vitest";
import type { Skill } from "../types/skill";
import {
  createSyncPlan,
  mergeSkillsByLatest,
  runSyncEngine,
} from "./sync-engine";

function makeSkill(partial: Partial<Skill>): Skill {
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? "unnamed-skill",
    description: partial.description ?? "",
    category: partial.category ?? "misc",
    source: partial.source ?? "manual",
    sourceType: partial.sourceType ?? "manual",
    skillPath: partial.skillPath ?? "",
    rawUrl: partial.rawUrl ?? "",
    body: partial.body ?? "",
    addedAt: partial.addedAt ?? new Date().toISOString(),
  };
}

describe("sync-engine", () => {
  it("keeps newer local skill when keys collide", () => {
    const local = [
      makeSkill({
        name: "grill-with-docs",
        source: "mattpocock/skills",
        addedAt: "2026-06-23T10:00:00.000Z",
      }),
    ];

    const remote = [
      makeSkill({
        name: "grill-with-docs",
        source: "mattpocock/skills",
        addedAt: "2026-06-22T10:00:00.000Z",
      }),
    ];

    const merged = mergeSkillsByLatest(local, remote);

    expect(merged).toHaveLength(1);
    expect(merged[0].addedAt).toBe("2026-06-23T10:00:00.000Z");
  });

  it("creates sync plan with upserts and pending deletes", () => {
    const local = [
      makeSkill({ name: "a", source: "repo/one" }),
      makeSkill({ name: "b", source: "repo/two" }),
    ];
    const remote = [
      makeSkill({ name: "a", source: "repo/one" }),
      makeSkill({ name: "z", source: "repo/deleted" }),
    ];

    const plan = createSyncPlan(local, remote, {
      pendingDeleteKeys: ["z::repo/deleted"],
    });

    expect(plan.upsertCloud).toHaveLength(1);
    expect(plan.upsertCloud[0].name).toBe("b");
    expect(plan.deleteCloudKeys).toEqual(["z::repo/deleted"]);
    expect(plan.replaceLocalWith.find((s) => s.name === "z")).toBeUndefined();
  });

  it("runs sync engine and executes upsert/delete plan", async () => {
    const local = [
      makeSkill({ name: "a", source: "repo/one", addedAt: "2026-06-20T00:00:00.000Z" }),
      makeSkill({ name: "b", source: "repo/two", addedAt: "2026-06-21T00:00:00.000Z" }),
    ];
    const remote = [
      makeSkill({ name: "a", source: "repo/one", addedAt: "2026-06-19T00:00:00.000Z" }),
    ];

    let replaced: Skill[] = [];
    let upserted: Skill[] = [];
    let deleted: string[] = [];

    const result = await runSyncEngine(
      {
        getAllSkills: async () => local,
        replaceAllSkills: async (skills) => {
          replaced = skills;
        },
      },
      {
        fetchCloudSkills: async () => remote,
        upsertCloudSkills: async (skills) => {
          upserted = skills;
        },
        deleteCloudSkillsByKeys: async (skillKeys) => {
          deleted = skillKeys;
        },
      },
      {
        pendingDeleteKeys: ["removed::repo/three"],
      },
    );

    expect(result.mergedSkills).toHaveLength(2);
    expect(replaced).toHaveLength(2);
    expect(upserted).toHaveLength(2);
    expect(upserted.map((skill) => skill.name).sort()).toEqual(["a", "b"]);
    expect(deleted).toEqual(["removed::repo/three"]);
    expect(result.syncPlan.deleteCloudKeys).toEqual(["removed::repo/three"]);
  });
});
