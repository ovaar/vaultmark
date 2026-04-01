import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEditorStore } from "../../stores/editorStore";

export function Preview() {
  const activeFile = useEditorStore((s) => s.activeFile);
  const openFiles = useEditorStore((s) => s.openFiles);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  if (!currentFile) {
    return (
      <div className="preview-empty">
        <p>No file selected</p>
      </div>
    );
  }

  return (
    <div className="preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {currentFile.content}
      </ReactMarkdown>
    </div>
  );
}
