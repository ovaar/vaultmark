import { useState } from "react";
import { useBackupStore, type BackupInterval } from "../../stores/backupStore";
import { useFileStore } from "../../stores/fileStore";

export function BackupPanel() {
  const [expanded, setExpanded] = useState(false);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const loadFileTree = useFileStore((s) => s.loadFileTree);
  const { backups, loading, createBackup, restoreBackup, deleteBackup, loadBackups, autoBackupInterval, setAutoBackupInterval } =
    useBackupStore();

  const handleExpand = () => {
    if (!expanded) {
      loadBackups(vaultRoot);
    }
    setExpanded(!expanded);
  };

  const handleRestore = async (backupId: string) => {
    if (confirm("Restore this backup? Current files will be replaced.")) {
      await restoreBackup(vaultRoot, backupId);
      await loadFileTree();
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="backup-panel" role="region" aria-label="Backups">
      <div className="backup-header" onClick={handleExpand} role="button" tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleExpand(); } }}
      >
        <span>{expanded ? "▼" : "▶"} Backups</span>
      </div>
      {expanded && (
        <div className="backup-content">
          <button
            className="backup-create-btn"
            onClick={() => createBackup(vaultRoot)}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Backup"}
          </button>

          <div className="backup-auto-setting">
            <label htmlFor="auto-backup-interval" className="backup-auto-label">
              Auto-backup
            </label>
            <select
              id="auto-backup-interval"
              className="backup-auto-select"
              value={autoBackupInterval}
              onChange={(e) => setAutoBackupInterval(e.target.value as BackupInterval)}
            >
              <option value="off">Off</option>
              <option value="30min">Every 30 min</option>
              <option value="1h">Every hour</option>
              <option value="4h">Every 4 hours</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          {backups.length === 0 ? (
            <p className="backup-empty">No backups yet</p>
          ) : (
            <ul className="backup-list">
              {backups.map((b) => (
                <li key={b.id} className="backup-item">
                  <div className="backup-info">
                    <span className="backup-date">{formatDate(b.created_at)}</span>
                    <span className="backup-size">{formatSize(b.size_bytes)}</span>
                  </div>
                  <div className="backup-actions">
                    <button
                      className="backup-btn"
                      onClick={() => handleRestore(b.id)}
                    >
                      Restore
                    </button>
                    <button
                      className="backup-btn danger"
                      onClick={() => deleteBackup(vaultRoot, b.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
