import { useState } from "react";
import { useBackupStore } from "../../stores/backupStore";
import { useFileStore } from "../../stores/fileStore";

export function BackupPanel() {
  const [expanded, setExpanded] = useState(false);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const loadFileTree = useFileStore((s) => s.loadFileTree);
  const { backups, loading, createBackup, restoreBackup, deleteBackup, loadBackups } =
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
    <div className="backup-panel">
      <div className="backup-header" onClick={handleExpand}>
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
