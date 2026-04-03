import { useState, useEffect } from "react";
import { useRemarkableStore } from "../../stores/remarkableStore";

export function RemarkablePanel() {
  const [expanded, setExpanded] = useState(false);
  const {
    connection,
    password,
    status,
    hostname,
    error,
    entries,
    loadingFiles,
    setConnection,
    setPassword,
    testConnection,
    disconnect,
    loadFiles,
    loadSavedConnection,
  } = useRemarkableStore();

  useEffect(() => {
    loadSavedConnection();
  }, [loadSavedConnection]);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const handleConnect = async () => {
    const success = await testConnection();
    if (success) {
      await loadFiles();
    }
  };

  const statusIndicator = () => {
    switch (status) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const formatTimestamp = (ts: string) => {
    const num = parseInt(ts, 10);
    if (isNaN(num)) return ts;
    try {
      return new Date(num).toLocaleDateString();
    } catch {
      return ts;
    }
  };

  const folders = entries.filter((e) => e.entry_type === "collection");
  const documents = entries.filter((e) => e.entry_type === "document");

  return (
    <div className="remarkable-panel" role="region" aria-label="reMarkable">
      <div
        className="remarkable-header"
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleExpand();
          }
        }}
      >
        <span>
          {expanded ? "▼" : "▶"} reMarkable {statusIndicator()}
        </span>
      </div>

      {expanded && (
        <div className="remarkable-content">
          {status !== "connected" ? (
            <div className="remarkable-connect-form">
              <div className="remarkable-field">
                <label htmlFor="rm-host">Host</label>
                <input
                  id="rm-host"
                  type="text"
                  value={connection.host}
                  onChange={(e) => setConnection({ host: e.target.value })}
                  placeholder="10.11.99.1"
                />
              </div>
              <div className="remarkable-field">
                <label htmlFor="rm-port">Port</label>
                <input
                  id="rm-port"
                  type="number"
                  value={connection.port}
                  onChange={(e) =>
                    setConnection({ port: parseInt(e.target.value, 10) || 22 })
                  }
                />
              </div>
              <div className="remarkable-field">
                <label htmlFor="rm-username">Username</label>
                <input
                  id="rm-username"
                  type="text"
                  value={connection.username}
                  onChange={(e) => setConnection({ username: e.target.value })}
                />
              </div>
              <div className="remarkable-field">
                <label htmlFor="rm-password">Password</label>
                <input
                  id="rm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Device password"
                />
              </div>
              <button
                className="remarkable-connect-btn"
                onClick={handleConnect}
                disabled={status === "connecting" || !connection.host || !password}
              >
                {status === "connecting" ? "Connecting..." : "Connect via SSH"}
              </button>
              {error && <p className="remarkable-error">{error}</p>}
              <p className="remarkable-hint">
                Find your password in Settings → Help → Copyright and licenses
              </p>
            </div>
          ) : (
            <div className="remarkable-connected">
              <div className="remarkable-device-info">
                <span className="remarkable-device-name">
                  {hostname || "reMarkable"}
                </span>
                <button className="remarkable-disconnect-btn" onClick={disconnect}>
                  Disconnect
                </button>
              </div>

              <button
                className="remarkable-refresh-btn"
                onClick={loadFiles}
                disabled={loadingFiles}
              >
                {loadingFiles ? "Loading..." : "Refresh Files"}
              </button>

              {error && <p className="remarkable-error">{error}</p>}

              {entries.length === 0 && !loadingFiles ? (
                <p className="remarkable-empty">No files found on device</p>
              ) : (
                <div className="remarkable-file-list">
                  {folders.length > 0 && (
                    <div className="remarkable-section">
                      <span className="remarkable-section-title">Folders</span>
                      <ul className="remarkable-entries">
                        {folders.map((f) => (
                          <li key={f.id} className="remarkable-entry">
                            <span className="remarkable-entry-icon">📁</span>
                            <span className="remarkable-entry-name">
                              {f.visible_name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {documents.length > 0 && (
                    <div className="remarkable-section">
                      <span className="remarkable-section-title">Documents</span>
                      <ul className="remarkable-entries">
                        {documents.map((d) => (
                          <li key={d.id} className="remarkable-entry">
                            <span className="remarkable-entry-icon">📄</span>
                            <span className="remarkable-entry-name">
                              {d.visible_name}
                            </span>
                            <span className="remarkable-entry-date">
                              {formatTimestamp(d.last_modified)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
