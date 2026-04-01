import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { useEditorStore } from "../../stores/editorStore";
import { useFileStore } from "../../stores/fileStore";

export function MarkdownEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const activeFile = useEditorStore((s) => s.activeFile);
  const openFiles = useEditorStore((s) => s.openFiles);
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveFile = useEditorStore((s) => s.saveFile);
  const vaultRoot = useFileStore((s) => s.vaultRoot);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  const handleSave = useCallback(() => {
    if (activeFile) {
      saveFile(vaultRoot, activeFile);
    }
  }, [activeFile, vaultRoot, saveFile]);

  useEffect(() => {
    if (!editorRef.current || !currentFile) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && activeFile) {
        updateContent(activeFile, update.state.doc.toString());
      }
    });

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          handleSave();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: currentFile.content,
      extensions: [
        basicSetup,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        keymap.of([...defaultKeymap, indentWithTab]),
        saveKeymap,
        updateListener,
        EditorView.lineWrapping,
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          },
          ".cm-content": {
            padding: "16px",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [activeFile]); // Recreate on file switch

  // Update editor content when external changes happen (e.g., file reload)
  useEffect(() => {
    if (!viewRef.current || !currentFile) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc !== currentFile.content && !currentFile.dirty) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: currentFile.content,
        },
      });
    }
  }, [currentFile?.content]);

  if (!currentFile) {
    return (
      <div className="editor-empty">
        <p>Select a file to start editing</p>
        <p className="hint">
          Use the file tree on the left, or press Cmd+N to create a new file
        </p>
      </div>
    );
  }

  return <div ref={editorRef} className="markdown-editor" />;
}
