import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import type { VaultInfo } from "../../stores/vaultStore";

interface WelcomeScreenProps {
  recentVaults: VaultInfo[];
  onSelectVault: (path: string) => void;
  onRemoveVault: (path: string) => void;
}

async function expandTilde(path: string): Promise<string> {
  if (path.startsWith("~/") || path === "~") {
    const home = await homeDir();
    return path.replace("~", home.replace(/\/+$/, ""));
  }
  return path;
}

export function WelcomeScreen({ recentVaults, onSelectVault, onRemoveVault }: WelcomeScreenProps) {
  const [vaultPath, setVaultPath] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vaultPath) {
      homeDir()
        .then((home) => setVaultPath(`${home}/VaultMark`))
        .catch(() => setVaultPath("/tmp/VaultMark"));
    }
  }, [vaultPath]);

  const handleCreate = async () => {
    if (!vaultPath.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const resolved = await expandTilde(vaultPath.trim());
      onSelectVault(resolved);
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  };

  const handleOpenExisting = async () => {
    try {
      const selected = await open({ directory: true, title: "Open Vault" });
      if (selected) {
        onSelectVault(selected);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1 className="welcome-title">VaultMark</h1>
        <p className="welcome-subtitle">
          Your local-first knowledge manager. All files stay on your machine.
        </p>

        {recentVaults.length > 0 && (
          <div className="welcome-recent">
            <h2 className="welcome-section-title">Recent Vaults</h2>
            <ul className="welcome-vault-list">
              {recentVaults.map((vault) => (
                <li key={vault.path} className="welcome-vault-item">
                  <button
                    className="welcome-vault-btn"
                    onClick={() => onSelectVault(vault.path)}
                  >
                    <span className="welcome-vault-name">{vault.name}</span>
                    <span className="welcome-vault-path">{vault.path}</span>
                  </button>
                  <button
                    className="welcome-vault-remove"
                    onClick={(e) => { e.stopPropagation(); onRemoveVault(vault.path); }}
                    title="Remove from recent"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="welcome-divider">
              <span>or</span>
            </div>
          </div>
        )}

        <div className="welcome-form">
          <div className="welcome-actions-row">
            <button
              className="welcome-btn welcome-btn-secondary"
              onClick={handleOpenExisting}
            >
              Open Existing Vault
            </button>
          </div>

          <div className="welcome-divider">
            <span>create new</span>
          </div>

          <label className="welcome-label" htmlFor="vault-path">
            Vault location
          </label>
          <input
            id="vault-path"
            className="welcome-input"
            type="text"
            value={vaultPath}
            onChange={(e) => setVaultPath(e.target.value)}
            placeholder="~/VaultMark"
          />
          <p className="welcome-hint">
            This folder will store all your markdown notes and files.
          </p>

          {error && <p className="welcome-error">{error}</p>}

          <button
            className="welcome-btn"
            onClick={handleCreate}
            disabled={creating || !vaultPath.trim()}
          >
            {creating ? "Creating…" : "Create Vault"}
          </button>
        </div>
      </div>
    </div>
  );
}
