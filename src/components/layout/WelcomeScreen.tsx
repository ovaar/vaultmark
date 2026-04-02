import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

interface WelcomeScreenProps {
  defaultPath: string;
  onComplete: (path: string) => void;
}

export function WelcomeScreen({ defaultPath, onComplete }: WelcomeScreenProps) {
  const [vaultPath, setVaultPath] = useState(defaultPath);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!vaultPath.trim()) return;
    setCreating(true);
    setError(null);
    try {
      onComplete(vaultPath.trim());
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  };

  const handleOpenExisting = async () => {
    try {
      const selected = await open({ directory: true, title: "Open Vault" });
      if (selected) {
        onComplete(selected);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1 className="welcome-title">Welcome to VaultMark</h1>
        <p className="welcome-subtitle">
          Your local-first knowledge manager. All files stay on your machine.
        </p>

        <div className="welcome-form">
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
            {creating ? "Creating…" : "Create Vault & Get Started"}
          </button>

          <div className="welcome-divider">
            <span>or</span>
          </div>

          <button
            className="welcome-btn welcome-btn-secondary"
            onClick={handleOpenExisting}
          >
            Open Existing Vault
          </button>
        </div>
      </div>
    </div>
  );
}
