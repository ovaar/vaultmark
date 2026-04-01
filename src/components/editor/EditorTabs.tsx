import { useEditorStore } from "../../stores/editorStore";

export function EditorTabs() {
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFile = useEditorStore((s) => s.activeFile);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeFile = useEditorStore((s) => s.closeFile);

  if (openFiles.length === 0) return null;

  return (
    <div className="editor-tabs">
      {openFiles.map((file) => {
        const name = file.path.split("/").pop() || file.path;
        return (
          <div
            key={file.path}
            className={`editor-tab ${
              activeFile === file.path ? "active" : ""
            }`}
            onClick={() => setActiveFile(file.path)}
          >
            <span className="tab-name">
              {file.dirty && <span className="dirty-dot">●</span>}
              {name}
            </span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
