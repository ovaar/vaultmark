import { useEditorStore } from "../../stores/editorStore";

interface EditorToolbarProps {
  groupId: string;
}

export function EditorToolbar({ groupId }: EditorToolbarProps) {
  const group = useEditorStore((s) => s.groups.find((g) => g.id === groupId));
  const updateContent = useEditorStore((s) => s.updateContent);

  const activeFile = group?.activeFile ?? null;
  const currentFile = group?.openFiles.find((f) => f.path === activeFile);

  if (!currentFile || !activeFile) return null;

  // Don't show toolbar for binary files
  if (
    currentFile.content.startsWith("data:application/pdf;base64,") ||
    currentFile.content.startsWith("data:application/epub")
  ) {
    return null;
  }

  const wrapSelection = (prefix: string, suffix: string) => {
    const editor = document.querySelector(".cm-content") as HTMLElement | null;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const selectedText = sel.toString();
    if (!selectedText) return;

    const content = currentFile.content;
    const idx = content.indexOf(selectedText);
    if (idx === -1) return;

    const newContent =
      content.slice(0, idx) +
      prefix +
      selectedText +
      suffix +
      content.slice(idx + selectedText.length);

    updateContent(activeFile, newContent);
  };

  const insertAtCursor = (text: string) => {
    const editor = document.querySelector(".cm-content") as HTMLElement | null;
    if (!editor) return;

    const sel = window.getSelection();
    const selectedText = sel?.toString() || "";

    if (selectedText) {
      const content = currentFile.content;
      const idx = content.indexOf(selectedText);
      if (idx !== -1) {
        const newContent =
          content.slice(0, idx) + text + content.slice(idx + selectedText.length);
        updateContent(activeFile, newContent);
      }
    }
  };

  const insertLinePrefix = (prefix: string) => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || "";

    if (selectedText) {
      const lines = selectedText.split("\n");
      const prefixed = lines.map((line) => prefix + line).join("\n");
      insertAtCursor(prefixed);
    }
  };

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("**", "**")}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("*", "*")}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <em>I</em>
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("`", "`")}
        title="Inline Code"
        aria-label="Inline code"
      >
        {"</>"}
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("~~", "~~")}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <s>S</s>
      </button>
      <span className="toolbar-separator" />
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("[", "](url)")}
        title="Link"
        aria-label="Insert link"
      >
        🔗
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => insertLinePrefix("> ")}
        title="Blockquote"
        aria-label="Blockquote"
      >
        ❝
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => insertLinePrefix("- ")}
        title="Bullet List"
        aria-label="Bullet list"
      >
        ≡
      </button>
      <button
        className="toolbar-format-btn"
        onClick={() => wrapSelection("```\n", "\n```")}
        title="Code Block"
        aria-label="Code block"
      >
        {"{ }"}
      </button>
    </div>
  );
}
