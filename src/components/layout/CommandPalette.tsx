import { useState, useEffect, useRef } from "react";
import { useFileStore } from "../../stores/fileStore";
import { useEditorStore } from "../../stores/editorStore";
import { useBackupStore } from "../../stores/backupStore";
import { useVaultStore } from "../../stores/vaultStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { generateTocMarkdown } from "../editor/TableOfContents";
import { getModifierLabel } from "../../utils/platform";

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
  onSwitchVault: (path: string) => void;
  onOpenWelcome: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onToggleSidebar,
  onToggleTheme,
  onSwitchVault,
  onOpenWelcome,
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
  const updateContent = useEditorStore((s) => s.updateContent);
  const openFiles = useEditorStore((s) => s.openFiles);
  const createBackup = useBackupStore((s) => s.createBackup);
  const recentVaults = useVaultStore((s) => s.recentVaults);

  const mod = getModifierLabel();

  const commands: Command[] = [
    {
      id: "new-file",
      label: "New File",
      shortcut: `${mod}N`,
      action: () => {
        const name = prompt("New file name:", "untitled.md");
        if (name) createFile(name.endsWith(".md") ? name : `${name}.md`);
      },
    },
    {
      id: "save",
      label: "Save File",
      shortcut: `${mod}S`,
      action: () => {
        if (activeFile) saveFile(vaultRoot, activeFile);
      },
    },
    {
      id: "close-tab",
      label: "Close Tab",
      shortcut: `${mod}W`,
      action: () => {
        if (activeFile) closeFile(activeFile);
      },
    },
    {
      id: "view-edit",
      label: "View: Edit Mode",
      shortcut: `${mod}⇧E`,
      action: () => setViewMode("edit"),
    },
    {
      id: "view-split",
      label: "View: Split Mode",
      shortcut: `${mod}\\`,
      action: () => setViewMode("split"),
    },
    {
      id: "view-preview",
      label: "View: Preview Mode",
      shortcut: `${mod}⇧V`,
      action: () => setViewMode("preview"),
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      shortcut: `${mod}B`,
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
    {
      id: "insert-toc",
      label: "Insert Table of Contents",
      action: () => {
        if (!activeFile) return;
        const file = openFiles.find((f) => f.path === activeFile);
        if (!file) return;
        const toc = generateTocMarkdown(file.content);
        if (toc) {
          updateContent(activeFile, `## Table of Contents\n\n${toc}\n\n${file.content}`);
        }
      },
    },
    {
      id: "open-vault",
      label: "Open Vault...",
      action: async () => {
        const selected = await openDialog({ directory: true, title: "Open Vault" });
        if (selected) onSwitchVault(selected);
      },
    },
    {
      id: "new-vault",
      label: "Create New Vault...",
      action: () => onOpenWelcome(),
    },
    ...recentVaults
      .filter((v) => v.path !== vaultRoot)
      .slice(0, 5)
      .map((v) => ({
        id: `switch-vault-${v.path}`,
        label: `Switch to: ${v.name}`,
        action: () => onSwitchVault(v.path),
      })),
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
