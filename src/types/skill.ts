export type SourceType = "github" | "manual";

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  source: string;
  sourceType: SourceType;
  skillPath: string;
  rawUrl: string;
  body: string;
  addedAt: string;
};

export type ImportResult = { ok: true; record: Skill } | { ok: false; error: string };

export type CloudConfig = {
  url: string;
  anonKey: string;
};

export type ParsedRepo = {
  owner: string;
  repo: string;
  branch: string;
  skillPath?: string;
};
