import { useState, useEffect, useMemo } from "react";
import { useRemarkableStore } from "../../stores/remarkableStore";
import { useFileStore } from "../../stores/fileStore";
import { ConnectionGuide } from "./ConnectionGuide";
import { RemarkableTreeItem } from "./RemarkableTreeItem";
import type { RemarkableEntry } from "../../types/remarkable";

export function RemarkablePanel() {
  const [expanded, setExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
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
    saveCredentials,
  } = useRemarkableStore();

  const vaultRoot = useFileStore((s) => s.vaultRoot);

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
      if (vaultRoot) {
        await saveCredentials(vaultRoot);
      }
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

  // Build parent→children map for tree navigation
  const { rootEntries, childrenMap } = useMemo(() => {
    const map = new Map<string, RemarkableEntry[]>();
    const roots: RemarkableEntry[] = [];

    for (const entry of entries) {
      const parentId = entry.parent || "";
      if (!parentId || parentId === "trash") {
        // root-level entries (skip trash)
        if (parentId !== "trash") roots.push(entry);
      } else {
        const siblings = map.get(parentId) || [];
        siblings.push(entry);
        map.set(parentId, siblings);
      }
    }

    // Sort: folders first, then alphabetical
    roots.sort((a, b) => {
      if (a.entry_type !== b.entry_type) {
        return a.entry_type === "collection" ? -1 : 1;
      }
      return a.visible_name.localeCompare(b.visible_name);
    });

    return { rootEntries: roots, childrenMap: map };
  }, [entries]);

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
            <>
              <button
                className="remarkable-guide-btn"
                onClick={() => setShowGuide(true)}
              >
                Setup Guide
              </button>
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
            {showGuide && <ConnectionGuide onClose={() => setShowGuide(false)} />}
            </>
          ) : (
            <div className="remarkable-connected">
              <div className="remarkable-device-info">
                <span className="remarkable-device-name">
                  {hostname || "reMarkable"}
                </span>
                <button className="remarkable-disconnect-btn" onClick={() => disconnect(vaultRoot || undefined)}>
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
                <ul className="remarkable-tree" role="tree" aria-label="reMarkable files">
                  {rootEntries.map((entry) => (
                    <RemarkableTreeItem
                      key={entry.id}
                      entry={entry}
                      childrenMap={childrenMap}
                      depth={0}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
