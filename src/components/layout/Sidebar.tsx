import { FileTree } from "../files/FileTree";
import { BackupPanel } from "../backup/BackupPanel";

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <FileTree />
      </div>
      <div className="sidebar-bottom">
        <BackupPanel />
      </div>
    </div>
  );
}
