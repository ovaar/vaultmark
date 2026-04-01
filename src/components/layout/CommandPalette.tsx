import { useState, useEffect, useRef } from "react";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";
import { useBackupStore } from "../../stores/backupStore";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onToggleSidebar,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const createFile = useFileStore((s) => s.createFile);
  const loadFileTree = useFileStore((s) => s.loadFileTree);
  const activeFile = useEditorStore((s) => s.activeFile);
  const saveFile = useEditorStore((s) => s.saveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const createBackup = useBackupStore((s) => s.createBackup);

  const commands: Command[] = [
    {
      id: "new-file",
      label: "New File",
      shortcut: "⌘N",
      action: () => {
        const name = prompt("New file name:", "untitled.md");
        if (name) createFile(name.endsWith(".md") ? name : `${name}.md`);
      },
    },
    {
      id: "save",
      label: "Save File",
      shortcut: "⌘S",
      action: () => {
        if (activeFile) saveFile(vaultRoot, activeFile);
      },
    },
    {
      id: "close-tab",
      label: "Close Tab",
      shortcut: "⌘W",
      action: () => {
        if (activeFile) closeFile(activeFile);
      },
    },
    {
      id: "view-edit",
      label: "View: Edit Mode",
      shortcut: "⌘⇧E",
      action: () => setViewMode("edit"),
    },
    {
      id: "view-split",
      label: "View: Split Mode",
      shortcut: "⌘\\",
      action: () => setViewMode("split"),
    },
    {
      id: "view-preview",
      label: "View: Preview Mode",
      shortcut: "⌘⇧V",
      action: () => setViewMode("preview"),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      shortcut: "⌘B",
      action: onToggleSidebar,
    },
    {
      id: "toggle-theme",
      label: "Toggle Dark/Light Theme",
      action: onToggleTheme,
    },
    {
      id: "refresh-tree",
      label: "Refresh File Tree",
      action: () => loadFileTree(),
    },
    {
      id: "create-backup",
      label: "Create Backup",
      action: () => createBackup(vaultRoot),
    },
  ];

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

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

  const executeCommand = (cmd: Command) => {
    onClose();
    cmd.action();
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
      executeCommand(filtered[selectedIndex]);
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
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="palette-list">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`palette-item ${i === selectedIndex ? "selected" : ""}`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="palette-label">{cmd.label}</span>
              {cmd.shortcut && (
                <span className="palette-shortcut">{cmd.shortcut}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="palette-empty">No matching commands</div>
          )}
        </div>
      </div>
    </>
  );
}
