import { FileTree } from "../files/FileTree";
import { BackupPanel } from "../backup/BackupPanel";
import { TableOfContents } from "../editor/TableOfContents";
import { RemarkablePanel } from "../remarkable/RemarkablePanel";

export function Sidebar() {
  return (
    <div className="sidebar" role="complementary" aria-label="Sidebar">
      <div className="sidebar-content">
        <FileTree />
        <TableOfContents />
      </div>
      <div className="sidebar-bottom">
        <RemarkablePanel />
        <BackupPanel />
      </div>
    </div>
  );
}
