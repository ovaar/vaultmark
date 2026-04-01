import { useEffect, useState } from "react";
import { useFileStore } from "../../stores/fileStore";
import { FileTreeItem } from "./FileTreeItem";

export function FileTree() {
  const fileTree = useFileStore((s) => s.fileTree);
  const loading = useFileStore((s) => s.loading);
  const loadFileTree = useFileStore((s) => s.loadFileTree);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);

  const [showNewInput, setShowNewInput] = useState<"file" | "folder" | null>(
    null
  );
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (vaultRoot) {
      loadFileTree();
    }
  }, [vaultRoot, loadFileTree]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setShowNewInput(null);
      return;
    }
    if (showNewInput === "file") {
      const name = newName.endsWith(".md") ? newName : `${newName}.md`;
      await createFile(name);
    } else if (showNewInput === "folder") {
      await createFolder(newName);
    }
    setNewName("");
    setShowNewInput(null);
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">Files</span>
        <div className="file-tree-actions">
          <button
            className="icon-btn"
            onClick={() => setShowNewInput("file")}
            title="New File"
          >
            +📄
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowNewInput("folder")}
            title="New Folder"
          >
            +📁
          </button>
        </div>
      </div>

      {showNewInput && (
        <div className="new-item-input" style={{ paddingLeft: "8px" }}>
          <input
            placeholder={
              showNewInput === "file" ? "filename.md" : "folder name"
            }
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowNewInput(null);
                setNewName("");
              }
            }}
            autoFocus
          />
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : fileTree.length === 0 ? (
        <div className="empty-state">
          <p>No files yet.</p>
          <p>Create your first note!</p>
        </div>
      ) : (
        fileTree.map((entry) => (
          <FileTreeItem key={entry.path} entry={entry} depth={0} />
        ))
      )}
    </div>
  );
}
