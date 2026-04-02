import { useState } from "react";

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
      // The file_service.get_file_tree creates the vault root if it doesn't exist
      onComplete(vaultPath.trim());
    } catch (e) {
      setError(String(e));
      setCreating(false);
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
        </div>
      </div>
    </div>
  );
}
