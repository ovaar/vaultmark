import { useEditorStore } from "../../stores/editorStore";

interface EditorTabsProps {
  groupId: string;
}

export function EditorTabs({ groupId }: EditorTabsProps) {
  const group = useEditorStore((s) => s.groups.find((g) => g.id === groupId));
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const splitFileToGroup = useEditorStore((s) => s.splitFileToGroup);
  const setActiveGroup = useEditorStore((s) => s.setActiveGroup);

  if (!group || group.openFiles.length === 0) return null;

  const handleTabDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData("application/vaultmark-tab", path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTabDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const path = e.dataTransfer.getData("application/vaultmark-tab");
    if (!path) return;
    // Split the dragged file into a new group
    splitFileToGroup(path);
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/vaultmark-tab")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  return (
    <div
      className="editor-tabs"
      onDrop={handleTabDrop}
      onDragOver={handleTabDragOver}
    >
      {group.openFiles.map((file) => {
        const name = file.path.replace(/\\/g, "/").split("/").pop() || file.path;
        return (
          <div
            key={file.path}
            className={`editor-tab ${
              group.activeFile === file.path ? "active" : ""
            }`}
            onClick={() => { setActiveGroup(groupId); setActiveFile(file.path); }}
            draggable
            onDragStart={(e) => handleTabDragStart(e, file.path)}
          >
            <span className="tab-name">
              {file.dirty && <span className="dirty-dot">●</span>}
              {name}
            </span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
