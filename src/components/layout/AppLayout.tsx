import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { EditorTabs } from "../editor/EditorTabs";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { Preview } from "../editor/Preview";
import { EditorToolbar } from "../editor/EditorToolbar";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { QuickOpen } from "./QuickOpen";
import { ToastContainer } from "./ToastContainer";
import { useEditorStore } from "../../stores/editorStore";
import { useFileStore } from "../../stores/fileStore";
import { useAutosave } from "../../hooks/useAutosave";
import { useAutoBackup } from "../../hooks/useAutoBackup";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { listen } from "@tauri-apps/api/event";

interface AppLayoutProps {
  onSwitchVault: (path: string) => void;
  onOpenWelcome: () => void;
}

export function AppLayout({ onSwitchVault, onOpenWelcome }: AppLayoutProps) {
  useAutosave(1500);
  useAutoBackup();

  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const groups = useEditorStore((s) => s.groups);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup);

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [, setTheme] = useState<"dark" | "light">("dark");

  const toggleSidebar = useCallback(() => {
    setSidebarVisible((v) => !v);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onQuickOpen: () => setQuickOpenOpen(true),
    onToggleSidebar: toggleSidebar,
  });

  // Listen for native menu events from Tauri
  useEffect(() => {
    const unlisten = listen<string>("menu-event", (event) => {
      switch (event.payload) {
        case "new-file": {
          const name = prompt("New file name:", "untitled.md");
          if (name) {
            const fileName = name.endsWith(".md") ? name : `${name}.md`;
            useFileStore.getState().createFile(fileName);
          }
          break;
        }
        case "open-vault":
          onOpenWelcome();
          break;
        case "save": {
          const state = useEditorStore.getState();
          if (state.activeFile) {
            state.saveFile(useFileStore.getState().vaultRoot, state.activeFile);
          }
          break;
        }
        case "toggle-sidebar":
          toggleSidebar();
          break;
        case "command-palette":
          setCommandPaletteOpen(true);
          break;
        case "mode-edit":
          setViewMode("edit");
          break;
        case "mode-split":
          setViewMode("split");
          break;
        case "mode-preview":
          setViewMode("preview");
          break;
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [onOpenWelcome, toggleSidebar, setViewMode]);

  return (
    <div className="app-layout" role="application">
      {sidebarVisible && <Sidebar />}
      <main className="main-area">
        <div className="toolbar">
          <div className="toolbar-left">
            {!sidebarVisible && (
              <button
                className="toolbar-btn"
                onClick={toggleSidebar}
                title="Show Sidebar (⌘B)"
              >
                ☰
              </button>
            )}
          </div>
          <div className="toolbar-right">
            <div className="view-mode-toggle">
              <button
                className={viewMode === "edit" ? "active" : ""}
                onClick={() => setViewMode("edit")}
                title="Edit only"
              >
                Edit
              </button>
              <button
                className={viewMode === "split" ? "active" : ""}
                onClick={() => setViewMode("split")}
                title="Split view"
              >
                Split
              </button>
              <button
                className={viewMode === "preview" ? "active" : ""}
                onClick={() => setViewMode("preview")}
                title="Preview only"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
        <div className="editor-groups-container">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`editor-group${group.id === activeGroupId ? " active-group" : ""}`}
              onClick={() => setActiveGroup(group.id)}
            >
              <EditorTabs groupId={group.id} />
              {(viewMode === "edit" || viewMode === "split") && (
                <EditorToolbar groupId={group.id} />
              )}
              <div className={`editor-area mode-${viewMode}`}>
                {(viewMode === "edit" || viewMode === "split") && (
                  <div className="editor-pane">
                    <MarkdownEditor groupId={group.id} />
                  </div>
                )}
                {(viewMode === "preview" || viewMode === "split") && (
                  <div className="preview-pane">
                    <Preview groupId={group.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <StatusBar />
      </main>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
        onSwitchVault={onSwitchVault}
        onOpenWelcome={onOpenWelcome}
      />
      <QuickOpen
        open={quickOpenOpen}
        onClose={() => setQuickOpenOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}
