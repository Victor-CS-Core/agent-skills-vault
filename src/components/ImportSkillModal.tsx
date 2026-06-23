type ImportSkillModalProps = {
  onClose: () => void;
  repoUrl: string;
  onRepoUrlChange: (value: string) => void;
  skillFilter: string;
  onSkillFilterChange: (value: string) => void;
  onImport: () => void | Promise<void>;
  manualName: string;
  onManualNameChange: (value: string) => void;
  manualDesc: string;
  onManualDescChange: (value: string) => void;
  manualCat: string;
  onManualCatChange: (value: string) => void;
  manualSource: string;
  onManualSourceChange: (value: string) => void;
  manualBody: string;
  onManualBodyChange: (value: string) => void;
  onManualSave: () => void | Promise<void>;
  importStatus: string;
};

export default function ImportSkillModal({
  onClose,
  repoUrl,
  onRepoUrlChange,
  skillFilter,
  onSkillFilterChange,
  onImport,
  manualName,
  onManualNameChange,
  manualDesc,
  onManualDescChange,
  manualCat,
  onManualCatChange,
  manualSource,
  onManualSourceChange,
  manualBody,
  onManualBodyChange,
  onManualSave,
  importStatus,
}: ImportSkillModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Import Skill</h2>
          <button
            type="button"
            className="icon"
            onClick={onClose}
            aria-label="Close import modal"
          >
            ×
          </button>
        </div>
        <label>GitHub or skills.sh URL</label>
        <input
          value={repoUrl}
          onChange={(e) => onRepoUrlChange(e.target.value)}
          placeholder="https://github.com/owner/repo"
        />
        <label>Skill filter (optional)</label>
        <input
          value={skillFilter}
          onChange={(e) => onSkillFilterChange(e.target.value)}
          placeholder="to-prd"
        />
        <button
          type="button"
          className="btn full"
          onClick={() => void onImport()}
        >
          Fetch and Import
        </button>

        <hr />

        <h3>Add manually</h3>
        <label>Skill Name</label>
        <input
          value={manualName}
          onChange={(e) => onManualNameChange(e.target.value)}
          placeholder="Skill name"
        />
        <label>Description</label>
        <input
          value={manualDesc}
          onChange={(e) => onManualDescChange(e.target.value)}
          placeholder="Description"
        />
        <div className="row-2">
          <div>
            <label>Category</label>
            <input
              value={manualCat}
              onChange={(e) => onManualCatChange(e.target.value)}
              placeholder="Category"
            />
          </div>
          <div>
            <label>Source</label>
            <input
              value={manualSource}
              onChange={(e) => onManualSourceChange(e.target.value)}
              placeholder="Source"
            />
          </div>
        </div>
        <label>Skill Markdown Body</label>
        <textarea
          value={manualBody}
          onChange={(e) => onManualBodyChange(e.target.value)}
          rows={5}
          placeholder="Skill markdown body"
        />
        <button
          type="button"
          className="btn ghost full"
          onClick={() => void onManualSave()}
        >
          Save Manually
        </button>
        {importStatus && <p className="notice">{importStatus}</p>}
      </div>
    </div>
  );
}
