import { useEffect, useMemo, useState } from "react";
import CloudSyncModal from "./components/CloudSyncModal";
import ImportSkillModal from "./components/ImportSkillModal";
import SkillCard from "./components/SkillCard";
import SkillDetailModal from "./components/SkillDetailModal";
import { storeGetAll, storeRemove } from "./lib/storage";
import { markCloudDirty } from "./lib/cloud";
import { useCloudSync } from "./hooks/useCloudSync";
import { useSkillImport } from "./hooks/useSkillImport";
import type { Skill } from "./types/skill";

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const [importOpen, setImportOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  async function refreshSkills() {
    setSkills(await storeGetAll());
  }

  const cloud = useCloudSync({ onSkillsUpdated: setSkills });

  const skillImport = useSkillImport({
    onMutation: async () => {
      markCloudDirty();
      cloud.queueCloudSync();
      await refreshSkills();
    },
  });

  useEffect(() => {
    void (async () => {
      const savedView = localStorage.getItem("skill-vault-view");
      if (savedView === "card" || savedView === "list") setViewMode(savedView);
      await refreshSkills();
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem("skill-vault-view", viewMode);
  }, [viewMode]);

  async function handleDelete(skill: Skill) {
    if (!window.confirm(`Remove "${skill.name}" from your vault?`)) return;
    await storeRemove(skill.id);
    await refreshSkills();
    markCloudDirty();
    cloud.queueCloudSync();
    try {
      await cloud.removeCloudSkill(skill);
    } catch {
      // best effort
    }
  }

  const filteredSkills = useMemo(() => {
    if (!query.trim()) return skills;
    const q = query.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q),
    );
  }, [skills, query]);

  const sortedSkills = useMemo(
    () =>
      [...filteredSkills].sort(
        (a, b) => +new Date(b.addedAt) - +new Date(a.addedAt),
      ),
    [filteredSkills],
  );

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand-block">
          <div className="brand">Skill Vault</div>
          <div className="brand-kicker">local agent library</div>
        </div>
        <input
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a skill, source, or trigger"
          aria-label="Search skills"
        />

        <div className="header-actions">
          <span className="status">{cloud.cloudStatus}</span>
          <button className="btn ghost" onClick={() => setCloudOpen(true)}>
            {cloud.cloudConfig.url ? "Cloud Settings" : "Connect Cloud"}
          </button>
          {cloud.cloudConnected && (
            <button
              className="btn ghost"
              onClick={() => void cloud.syncWithCloud()}
              disabled={cloud.cloudSyncing}
            >
              {cloud.cloudSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
          <button className="btn" onClick={() => setImportOpen(true)}>
            Import Skill
          </button>
        </div>
      </header>

      <main className="main">
        <div className="toolbar">
          <div className="count-readout">
            <strong>{filteredSkills.length}</strong> of {skills.length} skills
          </div>
          <div className="segmented" aria-label="View mode">
            <button
              className={viewMode === "card" ? "active" : ""}
              onClick={() => setViewMode("card")}
            >
              Card
            </button>
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>
        </div>

        {sortedSkills.length === 0 ? (
          <section className="empty">
            <h2>No skills indexed</h2>
            <p>Import a repository or save a markdown skill to start the vault.</p>
          </section>
        ) : (
          <section className={`grid-${viewMode}`}>
            {sortedSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onOpen={setDetailSkill}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </main>

      {importOpen && (
        <ImportSkillModal
          onClose={() => setImportOpen(false)}
          repoUrl={skillImport.repoUrl}
          onRepoUrlChange={skillImport.setRepoUrl}
          skillFilter={skillImport.skillFilter}
          onSkillFilterChange={skillImport.setSkillFilter}
          onImport={skillImport.handleImport}
          manualName={skillImport.manualName}
          onManualNameChange={skillImport.setManualName}
          manualDesc={skillImport.manualDesc}
          onManualDescChange={skillImport.setManualDesc}
          manualCat={skillImport.manualCat}
          onManualCatChange={skillImport.setManualCat}
          manualSource={skillImport.manualSource}
          onManualSourceChange={skillImport.setManualSource}
          manualBody={skillImport.manualBody}
          onManualBodyChange={skillImport.setManualBody}
          onManualSave={() =>
            skillImport.handleManualSave(() => setImportOpen(false))
          }
          importStatus={skillImport.importStatus}
        />
      )}

      {cloudOpen && (
        <CloudSyncModal
          onClose={() => setCloudOpen(false)}
          cloudUrl={cloud.cloudUrl}
          onCloudUrlChange={cloud.setCloudUrl}
          cloudAnon={cloud.cloudAnon}
          onCloudAnonChange={cloud.setCloudAnon}
          cloudEmail={cloud.cloudEmail}
          onCloudEmailChange={cloud.setCloudEmail}
          onSaveConfig={cloud.saveCloudConfig}
          onSendMagicLink={cloud.signInCloud}
          onSync={() => {
            void cloud.syncWithCloud();
          }}
          canSync={cloud.cloudConnected}
          cloudSyncing={cloud.cloudSyncing}
          onClearConfig={cloud.clearCloudConfig}
          showSignOut={Boolean(cloud.cloudUser)}
          onSignOut={cloud.signOutCloud}
          cloudModalStatus={cloud.cloudModalStatus}
        />
      )}

      {detailSkill && (
        <SkillDetailModal
          skill={detailSkill}
          onClose={() => setDetailSkill(null)}
        />
      )}
    </div>
  );
}
