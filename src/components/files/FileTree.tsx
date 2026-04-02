import { useEffect, useRef, useState } from "react";
import { useFileStore } from "../../stores/fileStore";
import { FileTreeItem } from "./FileTreeItem";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export function FileTree() {
  const fileTree = useFileStore((s) => s.fileTree);
  const loading = useFileStore((s) => s.loading);
  const loadFileTree = useFileStore((s) => s.loadFileTree);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const createFile = useFileStore((s) => s.createFile);
  const createFolder = useFileStore((s) => s.createFolder);
  const importFile = useFileStore((s) => s.importFile);
  const moveEntry = useFileStore((s) => s.moveEntry);

  const [showNewInput, setShowNewInput] = useState<"file" | "folder" | null>(
    null
  );
  const [newName, setNewName] = useState("");
  const [rootDragOver, setRootDragOver] = useState(false);
  const rootDragCounter = useRef(0);

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

  const handleImportFile = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        title: "Import Files",
      });
      if (!selected) return;
      const files = Array.isArray(selected) ? selected : [selected];
      for (const filePath of files) {
        const fileName = filePath.split("/").pop() || filePath.split("\\").pop() || "imported";
        await importFile(filePath, fileName, false);
      }
    } catch {
      // Dialog cancelled or error
    }
  };

  const handleRootDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    rootDragCounter.current++;
    setRootDragOver(true);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRootDragLeave = () => {
    rootDragCounter.current--;
    if (rootDragCounter.current === 0) {
      setRootDragOver(false);
    }
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    rootDragCounter.current = 0;
    setRootDragOver(false);
    const fromPath = e.dataTransfer.getData("text/plain");
    if (!fromPath) return;
    // Only move if the item is inside a subdirectory (not already at root)
    if (!fromPath.includes("/")) return;
    try {
      await moveEntry(fromPath, "");
    } catch {
      // Error handled by store
    }
  };

  return (
    <div
      className={`file-tree${rootDragOver ? " root-drag-over" : ""}`}
      role="tree"
      aria-label="File explorer"
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      <div className="file-tree-header">
        <span className="file-tree-title" id="file-tree-title">Files</span>
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
          <button
            className="icon-btn"
            onClick={handleImportFile}
            title="Import File"
          >
            📥
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
