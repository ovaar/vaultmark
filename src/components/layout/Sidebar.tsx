import { useRef, useState, useCallback } from "react";
import { FileTree } from "../files/FileTree";
import { BackupPanel } from "../backup/BackupPanel";
import { TableOfContents } from "../editor/TableOfContents";
import { RemarkablePanel } from "../remarkable/RemarkablePanel";

const MIN_PANEL_HEIGHT = 80;

export function Sidebar() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [topRatio, setTopRatio] = useState(0.6); // 60% top, 40% bottom
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const y = ev.clientY - rect.top;
      const ratio = Math.max(
        MIN_PANEL_HEIGHT / totalHeight,
        Math.min(y / totalHeight, 1 - MIN_PANEL_HEIGHT / totalHeight)
      );
      setTopRatio(ratio);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const topPercent = `${topRatio * 100}%`;
  const bottomPercent = `${(1 - topRatio) * 100}%`;

  return (
    <div className="sidebar" role="complementary" aria-label="Sidebar" ref={sidebarRef}>
      <div className="sidebar-section" style={{ height: topPercent }}>
        <FileTree />
        <TableOfContents />
      </div>
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        aria-label="Resize sidebar panels"
      />
      <div className="sidebar-section" style={{ height: bottomPercent }}>
        <RemarkablePanel />
        <BackupPanel />
      </div>
    </div>
  );
}
