import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { EditorTabs } from "../editor/EditorTabs";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { Preview } from "../editor/Preview";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { QuickOpen } from "./QuickOpen";
import { ToastContainer } from "./ToastContainer";
import { useEditorStore } from "../../stores/editorStore";
import { useAutosave } from "../../hooks/useAutosave";
import { useAutoBackup } from "../../hooks/useAutoBackup";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";

interface AppLayoutProps {
  onSwitchVault: (path: string) => void;
  onOpenWelcome: () => void;
}

export function AppLayout({ onSwitchVault, onOpenWelcome }: AppLayoutProps) {
  useAutosave(1500);
  useAutoBackup();

  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

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
            <EditorTabs />
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
        <div className={`editor-area mode-${viewMode}`}>
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="editor-pane">
              <MarkdownEditor />
            </div>
          )}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className="preview-pane">
              <Preview />
            </div>
          )}
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
