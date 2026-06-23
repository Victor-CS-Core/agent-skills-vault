type CloudSyncModalProps = {
  onClose: () => void;
  cloudUrl: string;
  onCloudUrlChange: (value: string) => void;
  cloudAnon: string;
  onCloudAnonChange: (value: string) => void;
  cloudEmail: string;
  onCloudEmailChange: (value: string) => void;
  onSaveConfig: () => void | Promise<void>;
  onSendMagicLink: () => void | Promise<void>;
  onSync: () => void | Promise<void>;
  canSync: boolean;
  cloudSyncing: boolean;
  onClearConfig: () => void | Promise<void>;
  showSignOut: boolean;
  onSignOut: () => void | Promise<void>;
  cloudModalStatus: string;
};

export default function CloudSyncModal({
  onClose,
  cloudUrl,
  onCloudUrlChange,
  cloudAnon,
  onCloudAnonChange,
  cloudEmail,
  onCloudEmailChange,
  onSaveConfig,
  onSendMagicLink,
  onSync,
  canSync,
  cloudSyncing,
  onClearConfig,
  showSignOut,
  onSignOut,
  cloudModalStatus,
}: CloudSyncModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Cloud sync</h2>
          <button
            type="button"
            className="icon"
            onClick={onClose}
            aria-label="Close cloud modal"
          >
            ×
          </button>
        </div>
        <label>Supabase URL</label>
        <input
          value={cloudUrl}
          onChange={(e) => onCloudUrlChange(e.target.value)}
          placeholder="https://your-project.supabase.co"
        />
        <label>Anon key</label>
        <input
          value={cloudAnon}
          onChange={(e) => onCloudAnonChange(e.target.value)}
          placeholder="eyJ..."
        />
        <label>Email</label>
        <input
          value={cloudEmail}
          onChange={(e) => onCloudEmailChange(e.target.value)}
          placeholder="you@example.com"
        />

        <div className="cloud-actions cloud-actions-primary">
          <button
            type="button"
            className="btn"
            onClick={() => void onSaveConfig()}
          >
            Save config
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void onSendMagicLink()}
          >
            Send magic link
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void onSync()}
            disabled={!canSync || cloudSyncing}
          >
            Sync
          </button>
        </div>

        <div className="cloud-actions cloud-actions-secondary">
          <button
            type="button"
            className="btn ghost"
            onClick={() => void onClearConfig()}
          >
            Clear config
          </button>
          {showSignOut && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => void onSignOut()}
            >
              Sign out
            </button>
          )}
        </div>
        {cloudModalStatus && <p className="notice">{cloudModalStatus}</p>}
      </div>
    </div>
  );
}
