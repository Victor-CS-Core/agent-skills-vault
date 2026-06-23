import { useState } from "react";
import { storeAdd } from "../lib/storage";
import { importFromRepo, importSingleSkill, parseRepoUrl } from "../lib/import";
import type { ImportResult, Skill } from "../types/skill";

type UseSkillImportOptions = {
  onMutation: () => void | Promise<void>;
};

export function useSkillImport({ onMutation }: UseSkillImportOptions) {
  const [repoUrl, setRepoUrl] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCat, setManualCat] = useState("misc");
  const [manualSource, setManualSource] = useState("manual");
  const [manualBody, setManualBody] = useState("");

  async function handleImport() {
    try {
      if (!repoUrl.trim()) {
        setImportStatus("Please enter a URL.");
        return;
      }

      setImportStatus("Importing...");
      const parsed = parseRepoUrl(repoUrl.trim());
      let results: ImportResult[] = [];

      if (parsed.skillPath && parsed.skillPath.endsWith("SKILL.md")) {
        results = [
          await importSingleSkill(
            parsed.owner,
            parsed.repo,
            parsed.skillPath,
            parsed.branch,
          ),
        ];
      } else {
        results = await importFromRepo(
          parsed.owner,
          parsed.repo,
          skillFilter.trim(),
          parsed.branch,
        );
      }

      const ok = results.filter((r): r is { ok: true; record: Skill } => r.ok);
      const fail = results.filter((r): r is { ok: false; error: string } => !r.ok);

      if (ok.length === 0) {
        setImportStatus(`All imports failed. ${fail.map((f) => f.error).join(" | ")}`);
      } else {
        setImportStatus(
          `Imported ${ok.length} skill${ok.length === 1 ? "" : "s"}. ${fail.length ? `${fail.length} skipped.` : ""}`,
        );
        await onMutation();
      }
    } catch (error) {
      setImportStatus((error as Error).message);
    }
  }

  async function handleManualSave(onSaved?: () => void) {
    if (!manualName.trim()) {
      setImportStatus("Skill name is required.");
      return;
    }

    await storeAdd({
      name: manualName.trim(),
      description: manualDesc.trim(),
      category: manualCat.trim() || "misc",
      source: manualSource.trim() || "manual",
      sourceType: "manual",
      skillPath: "",
      rawUrl: "",
      body: manualBody,
    });

    await onMutation();

    onSaved?.();
    setManualName("");
    setManualDesc("");
    setManualCat("misc");
    setManualSource("manual");
    setManualBody("");
  }

  return {
    repoUrl,
    setRepoUrl,
    skillFilter,
    setSkillFilter,
    importStatus,
    setImportStatus,
    manualName,
    setManualName,
    manualDesc,
    setManualDesc,
    manualCat,
    setManualCat,
    manualSource,
    setManualSource,
    manualBody,
    setManualBody,
    handleImport,
    handleManualSave,
  };
}
