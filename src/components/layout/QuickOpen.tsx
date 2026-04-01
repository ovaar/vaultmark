import { useState, useEffect, useRef, useMemo } from "react";
import type { FileEntry } from "../../types/file";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";

interface QuickOpenProps {
  open: boolean;
  onClose: () => void;
}

function flattenTree(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (!entry.is_dir) {
      result.push(entry);
    }
    if (entry.children) {
      result.push(...flattenTree(entry.children));
    }
  }
  return result;
}

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileTree = useFileStore((s) => s.fileTree);
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const selectFile = useFileStore((s) => s.selectFile);
  const openFile = useEditorStore((s) => s.openFile);

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree]);

  const filtered = query
    ? allFiles.filter((f) =>
        f.path.toLowerCase().includes(query.toLowerCase())
      )
    : allFiles;

  useEffect(() => {
    if (open) {
      setQuery(""); // eslint-disable-line react-hooks/set-state-in-effect
      setSelectedIndex(0);  
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0); // eslint-disable-line react-hooks/set-state-in-effect
  }, [query]);

  const selectAndOpen = (file: FileEntry) => {
    onClose();
    selectFile(file.path);
    openFile(vaultRoot, file.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      selectAndOpen(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="palette-overlay" onClick={onClose} />
      <div className="palette">
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="palette-list">
          {filtered.map((file, i) => (
            <div
              key={file.path}
              className={`palette-item ${i === selectedIndex ? "selected" : ""}`}
              onClick={() => selectAndOpen(file)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="palette-label">📄 {file.name}</span>
              <span className="palette-shortcut palette-path">{file.path}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="palette-empty">No matching files</div>
          )}
        </div>
      </div>
    </>
  );
}
