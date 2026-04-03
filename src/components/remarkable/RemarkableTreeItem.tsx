import { useState } from "react";
import type { RemarkableEntry } from "../../types/remarkable";
import { useEditorStore } from "../../stores/editorStore";

interface RemarkableTreeItemProps {
  entry: RemarkableEntry;
  childrenMap: Map<string, RemarkableEntry[]>;
  depth: number;
}

export function RemarkableTreeItem({ entry, childrenMap, depth }: RemarkableTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isFolder = entry.entry_type === "collection";
  const children = childrenMap.get(entry.id) || [];

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      useEditorStore.getState().openRemarkableFile(entry.id, entry.visible_name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    } else if (e.key === "ArrowRight" && isFolder && !expanded) {
      e.preventDefault();
      setExpanded(true);
    } else if (e.key === "ArrowLeft" && isFolder && expanded) {
      e.preventDefault();
      setExpanded(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    const num = parseInt(ts, 10);
    if (isNaN(num)) return ts;
    try {
      return new Date(num).toLocaleDateString();
    } catch {
      return ts;
    }
  };

  return (
    <li role="treeitem" aria-expanded={isFolder ? expanded : undefined}>
      <div
        className="remarkable-tree-item"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
      >
        {isFolder ? (
          <span className="remarkable-tree-caret">
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="remarkable-tree-caret-spacer" />
        )}
        <span className="remarkable-tree-icon">
          {isFolder ? "📁" : "📄"}
        </span>
        <span className="remarkable-tree-name">{entry.visible_name}</span>
        {!isFolder && entry.last_modified && (
          <span className="remarkable-tree-date">
            {formatTimestamp(entry.last_modified)}
          </span>
        )}
        {entry.pinned && <span className="remarkable-tree-pin" title="Pinned">📌</span>}
      </div>
      {isFolder && expanded && children.length > 0 && (
        <ul className="remarkable-tree-children" role="group">
          {children
            .sort((a, b) => {
              // Folders first, then alphabetical
              if (a.entry_type !== b.entry_type) {
                return a.entry_type === "collection" ? -1 : 1;
              }
              return a.visible_name.localeCompare(b.visible_name);
            })
            .map((child) => (
              <RemarkableTreeItem
                key={child.id}
                entry={child}
                childrenMap={childrenMap}
                depth={depth + 1}
              />
            ))}
        </ul>
      )}
      {isFolder && expanded && children.length === 0 && (
        <div
          className="remarkable-tree-empty"
          style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
        >
          Empty folder
        </div>
      )}
    </li>
  );
}
