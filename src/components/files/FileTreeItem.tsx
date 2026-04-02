import { useRef, useState } from "react";
import type { FileEntry } from "../../types/file";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
}

export function FileTreeItem({ entry, depth }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  const selectedFile = useFileStore((s) => s.selectedFile);
  const selectFile = useFileStore((s) => s.selectFile);
  const deleteFile = useFileStore((s) => s.deleteFile);
  const renameFile = useFileStore((s) => s.renameFile);
  const moveEntry = useFileStore((s) => s.moveEntry);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const openFile = useEditorStore((s) => s.openFile);

  const isSelected = selectedFile === entry.path;

  const handleClick = () => {
    if (entry.is_dir) {
      setExpanded(!expanded);
    } else {
      selectFile(entry.path);
      openFile(vaultRoot, entry.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = async () => {
    setContextMenu(null);
    if (confirm(`Delete "${entry.name}"?`)) {
      await deleteFile(entry.path);
    }
  };

  const handleRename = () => {
    setContextMenu(null);
    setRenaming(true);
    setNewName(entry.name);
  };

  const handleMove = async () => {
    setContextMenu(null);
    const targetDir = prompt("Move to directory (relative path):", "");
    if (targetDir !== null && targetDir.trim() !== "") {
      await moveEntry(entry.path, targetDir.trim());
    }
  };

  const submitRename = async () => {
    setRenaming(false);
    if (newName && newName !== entry.name) {
      const parentPath = entry.path.includes("/")
        ? entry.path.substring(0, entry.path.lastIndexOf("/"))
        : "";
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      await renameFile(entry.path, newPath);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", entry.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!entry.is_dir) return;
    dragCounter.current++;
    setDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!entry.is_dir) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!entry.is_dir) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    if (!entry.is_dir) return;
    const fromPath = e.dataTransfer.getData("text/plain");
    if (!fromPath || fromPath === entry.path) return;
    // Don't drop into self or descendant
    if (fromPath.startsWith(entry.path + "/")) return;
    // Don't drop into same parent (no-op)
    const parentOfSource = fromPath.includes("/")
      ? fromPath.substring(0, fromPath.lastIndexOf("/"))
      : "";
    if (parentOfSource === entry.path) return;
    try {
      await moveEntry(fromPath, entry.path);
      setExpanded(true);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div
      onDragEnter={entry.is_dir ? handleDragEnter : undefined}
      onDragOver={entry.is_dir ? handleDragOver : undefined}
      onDragLeave={entry.is_dir ? handleDragLeave : undefined}
      onDrop={entry.is_dir ? handleDrop : undefined}
    >
      <div
        className={`file-tree-item ${isSelected ? "selected" : ""}${dragOver ? " drag-over" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!renaming}
        onDragStart={handleDragStart}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={entry.is_dir ? expanded : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <span className="file-tree-icon">
          {entry.is_dir ? (expanded ? "📂" : "📁") : "📄"}
        </span>
        {renaming ? (
          <input
            className="rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="file-tree-name">{entry.name}</span>
        )}
      </div>

      {contextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button onClick={handleRename}>Rename</button>
            <button onClick={handleMove}>Move to...</button>
            <button onClick={handleDelete} className="danger">
              Delete
            </button>
          </div>
        </>
      )}

      {entry.is_dir && expanded && entry.children && (
        <div className="file-tree-children" role="group">
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
