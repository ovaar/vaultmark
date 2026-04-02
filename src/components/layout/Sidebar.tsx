import { FileTree } from "../files/FileTree";
import { BackupPanel } from "../backup/BackupPanel";
import { TableOfContents } from "../editor/TableOfContents";

export function Sidebar() {
  return (
    <div className="sidebar" role="complementary" aria-label="Sidebar">
      <div className="sidebar-content">
        <FileTree />
        <TableOfContents />
      </div>
      <div className="sidebar-bottom">
        <BackupPanel />
      </div>
    </div>
  );
}
