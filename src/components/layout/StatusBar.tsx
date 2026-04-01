import { useEditorStore } from "../../stores/editorStore";

export function StatusBar() {
  const activeFile = useEditorStore((s) => s.activeFile);
  const openFiles = useEditorStore((s) => s.openFiles);
  const viewMode = useEditorStore((s) => s.viewMode);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  const wordCount = currentFile
    ? currentFile.content
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0;

  const lineCount = currentFile
    ? currentFile.content.split("\n").length
    : 0;

  return (
    <div className="status-bar">
      <div className="status-left">
        {activeFile && (
          <>
            <span className="status-item">{activeFile}</span>
            {currentFile?.dirty && (
              <span className="status-item status-dirty">Modified</span>
            )}
          </>
        )}
      </div>
      <div className="status-right">
        {currentFile && (
          <>
            <span className="status-item">
              {lineCount} lines · {wordCount} words
            </span>
          </>
        )}
        <span className="status-item">
          View: {viewMode}
        </span>
      </div>
    </div>
  );
}
