import { Sidebar } from "./Sidebar";
import { EditorTabs } from "../editor/EditorTabs";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { Preview } from "../editor/Preview";
import { StatusBar } from "./StatusBar";
import { useEditorStore } from "../../stores/editorStore";
import { useAutosave } from "../../hooks/useAutosave";

export function AppLayout() {
  useAutosave(1500);

  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <div className="toolbar">
          <div className="toolbar-left">
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
      </div>
    </div>
  );
}
