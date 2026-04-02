import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEditorStore } from "../../stores/editorStore";

export function Preview({ groupId }: { groupId: string }) {
  const group = useEditorStore((s) => s.groups.find((g) => g.id === groupId));

  const activeFile = group?.activeFile ?? null;
  const currentFile = group?.openFiles.find((f) => f.path === activeFile);

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
