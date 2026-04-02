import { useMemo } from "react";
import { useEditorStore } from "../../stores/editorStore";

interface TocEntry {
  level: number;
  text: string;
  slug: string;
}

function parseHeadings(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      entries.push({ level, text, slug });
    }
  }
  return entries;
}

export function generateTocMarkdown(content: string): string {
  const headings = parseHeadings(content);
  if (headings.length === 0) return "";

  const minLevel = Math.min(...headings.map((h) => h.level));
  return headings
    .map((h) => {
      const indent = "  ".repeat(h.level - minLevel);
      return `${indent}- [${h.text}](#${h.slug})`;
    })
    .join("\n");
}

export function TableOfContents() {
  const activeFile = useEditorStore((s) => s.activeFile);
  const openFiles = useEditorStore((s) => s.openFiles);

  const currentContent = useMemo(() => {
    if (!activeFile) return "";
    const file = openFiles.find((f) => f.path === activeFile);
    return file?.content ?? "";
  }, [activeFile, openFiles]);

  const headings = useMemo(() => parseHeadings(currentContent), [currentContent]);

  if (!activeFile || headings.length === 0) return null;

  return (
    <nav className="toc-panel" aria-label="Table of contents">
      <h3 className="toc-title">Contents</h3>
      <ul className="toc-list">
        {headings.map((h, i) => (
          <li
            key={`${h.slug}-${i}`}
            className="toc-item"
            style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
          >
            <span className="toc-link">{h.text}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
