import { useRef, useState } from "react";
import type { FileEntry } from "../../types/file";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";
import { getDragPath, setDragPath } from "./dragState";

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
  const [dragInvalid, setDragInvalid] = useState(false);
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
      const normalized = entry.path.replace(/\\/g, "/");
      const lastSlash = normalized.lastIndexOf("/");
      const parentPath = lastSlash >= 0 ? normalized.substring(0, lastSlash) : "";
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      await renameFile(entry.path, newPath);
    }
  };

  const isValidDrop = (fromPath: string): boolean => {
    if (!entry.is_dir) return false;
    if (!fromPath || fromPath === entry.path) return false;
    // Don't drop a folder into its own descendant (circular)
    if (entry.path.startsWith(fromPath + "/")) return false;
    // Don't drop into same parent (no-op)
    const parentOfSource = fromPath.includes("/")
      ? fromPath.substring(0, fromPath.lastIndexOf("/"))
      : "";
    if (parentOfSource === entry.path) return false;
    return true;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", entry.path);
    e.dataTransfer.effectAllowed = "move";
    setDragPath(entry.path);
  };

  const handleDragEnd = () => {
    setDragPath(null);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    const fromPath = getDragPath();
    if (fromPath && isValidDrop(fromPath)) {
      setDragOver(true);
    } else {
      setDragInvalid(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromPath = getDragPath();
    if (fromPath && isValidDrop(fromPath)) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOver(false);
      setDragInvalid(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    setDragInvalid(false);
    if (!entry.is_dir) return;
    const fromPath = e.dataTransfer.getData("text/plain");
    if (!fromPath || !isValidDrop(fromPath)) return;
    try {
      await moveEntry(fromPath, entry.path);
      setExpanded(true);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`file-tree-item ${isSelected ? "selected" : ""}${dragOver ? " drag-over" : ""}${dragInvalid ? " drag-invalid" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!renaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
          {entry.is_dir ? (expanded ? "▾" : "▸") : " "}
        </span>
        <span className="file-tree-icon file-tree-type-icon">
          {entry.is_dir ? "📁" : "📄"}
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
