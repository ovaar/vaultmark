import { useEffect, useCallback } from "react";
import { useFileStore } from "../stores/fileStore";
import { useEditorStore } from "../stores/editorStore";

export interface KeyboardAction {
  id: string;
  label: string;
  shortcut: string;
  action: () => void;
}

export function useKeyboardShortcuts(callbacks: {
  onCommandPalette: () => void;
  onQuickOpen: () => void;
  onToggleSidebar: () => void;
}) {
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const createFile = useFileStore((s) => s.createFile);
  const activeFile = useEditorStore((s) => s.activeFile);
  const saveFile = useEditorStore((s) => s.saveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+Shift+P — Command Palette
      if (mod && e.shiftKey && e.key === "p") {
        e.preventDefault();
        callbacks.onCommandPalette();
        return;
      }

      // Cmd+P — Quick Open
      if (mod && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        callbacks.onQuickOpen();
        return;
      }

      // Cmd+S — Save
      if (mod && e.key === "s") {
        e.preventDefault();
        if (activeFile) {
          saveFile(vaultRoot, activeFile);
        }
        return;
      }

      // Cmd+N — New File
      if (mod && e.key === "n") {
        e.preventDefault();
        const name = prompt("New file name:", "untitled.md");
        if (name) {
          createFile(name.endsWith(".md") ? name : `${name}.md`);
        }
        return;
      }

      // Cmd+W — Close Tab
      if (mod && e.key === "w") {
        e.preventDefault();
        if (activeFile) {
          closeFile(activeFile);
        }
        return;
      }

      // Cmd+B — Toggle Sidebar
      if (mod && e.key === "b") {
        e.preventDefault();
        callbacks.onToggleSidebar();
        return;
      }

      // Cmd+\ — Split view toggle
      if (mod && e.key === "\\") {
        e.preventDefault();
        setViewMode("split");
        return;
      }

      // Cmd+Shift+E — Edit mode
      if (mod && e.shiftKey && e.key === "e") {
        e.preventDefault();
        setViewMode("edit");
        return;
      }

      // Cmd+Shift+V — Preview mode
      if (mod && e.shiftKey && e.key === "v") {
        e.preventDefault();
        setViewMode("preview");
        return;
      }
    },
    [activeFile, vaultRoot, saveFile, closeFile, createFile, setViewMode, callbacks]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
