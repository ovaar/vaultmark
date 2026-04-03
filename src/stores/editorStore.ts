import { create } from "zustand";
import * as fileService from "../services/tauriFileService";
import * as remarkableService from "../services/tauriRemarkableService";
import { useRemarkableStore } from "./remarkableStore";
import { useToastStore } from "./toastStore";

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

export interface EditorGroup {
  id: string;
  openFiles: OpenFile[];
  activeFile: string | null;
}

interface EditorStore {
  groups: EditorGroup[];
  activeGroupId: string;
  viewMode: "edit" | "preview" | "split";

  // Derived from active group (kept in sync)
  openFiles: OpenFile[];
  activeFile: string | null;

  openFile: (vaultRoot: string, path: string) => Promise<void>;
  openRemarkableFile: (fileId: string, visibleName: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (vaultRoot: string, path: string) => Promise<void>;
  setViewMode: (mode: "edit" | "preview" | "split") => void;
  setActiveGroup: (groupId: string) => void;
  splitFileToGroup: (path: string) => void;
  moveFileToGroup: (path: string, targetGroupId: string) => void;
  closeGroup: (groupId: string) => void;
}

let groupCounter = 1;
function nextGroupId(): string {
  return `group-${groupCounter++}`;
}

const defaultGroupId = nextGroupId();

function getActiveGroup(state: { groups: EditorGroup[]; activeGroupId: string }): EditorGroup {
  return state.groups.find((g) => g.id === state.activeGroupId) || state.groups[0];
}

function updateGroup(groups: EditorGroup[], groupId: string, updater: (g: EditorGroup) => EditorGroup): EditorGroup[] {
  return groups.map((g) => (g.id === groupId ? updater(g) : g));
}

function cleanEmptyGroups(groups: EditorGroup[], activeGroupId: string): { groups: EditorGroup[]; activeGroupId: string } {
  const nonEmpty = groups.filter((g) => g.openFiles.length > 0);
  if (nonEmpty.length === 0) {
    // Keep at least one empty group
    return { groups: [groups[0] || { id: defaultGroupId, openFiles: [], activeFile: null }], activeGroupId: groups[0]?.id || defaultGroupId };
  }
  const newActiveId = nonEmpty.find((g) => g.id === activeGroupId)?.id || nonEmpty[0].id;
  return { groups: nonEmpty, activeGroupId: newActiveId };
}

// Derive convenience fields from groups
export const useEditorStore = create<EditorStore>((rawSet, get) => {
  // Wrap set to auto-derive openFiles/activeFile from active group
  const set: typeof rawSet = (partial) => {
    rawSet((prev) => {
      const next = typeof partial === "function" ? partial(prev) : { ...prev, ...partial };
      const merged = { ...prev, ...next };
      const active = merged.groups.find((g: EditorGroup) => g.id === merged.activeGroupId) || merged.groups[0];
      return {
        ...next,
        openFiles: active?.openFiles ?? [],
        activeFile: active?.activeFile ?? null,
      };
    });
  };

  return {
  groups: [{ id: defaultGroupId, openFiles: [], activeFile: null }],
  activeGroupId: defaultGroupId,
  openFiles: [],
  activeFile: null,
  viewMode: "split",

  openFile: async (vaultRoot: string, path: string) => {
    const state = get();
    const group = getActiveGroup(state);

    // If file already open in this group, just activate
    const existing = group.openFiles.find((f) => f.path === path);
    if (existing) {
      set({
        groups: updateGroup(state.groups, group.id, (g) => ({ ...g, activeFile: path })),
        activeGroupId: group.id,
      });
      return;
    }

    // If file is open in another group, focus that group
    for (const g of state.groups) {
      if (g.id !== group.id && g.openFiles.find((f) => f.path === path)) {
        set({
          groups: updateGroup(state.groups, g.id, (grp) => ({ ...grp, activeFile: path })),
          activeGroupId: g.id,
        });
        return;
      }
    }

    const result = await fileService.readFile(vaultRoot, path);
    set({
      groups: updateGroup(state.groups, group.id, (g) => ({
        ...g,
        openFiles: [...g.openFiles, { path, content: result.content, dirty: false }],
        activeFile: path,
      })),
    });
  },

  openRemarkableFile: async (fileId: string, visibleName: string) => {
    const remarkablePath = `remarkable://${fileId}/${visibleName}`;
    const state = get();
    const group = getActiveGroup(state);

    // If already open in this group, just activate
    const existing = group.openFiles.find((f) => f.path === remarkablePath);
    if (existing) {
      set({
        groups: updateGroup(state.groups, group.id, (g) => ({ ...g, activeFile: remarkablePath })),
        activeGroupId: group.id,
      });
      return;
    }

    // If open in another group, focus that group
    for (const g of state.groups) {
      if (g.id !== group.id && g.openFiles.find((f) => f.path === remarkablePath)) {
        set({
          groups: updateGroup(state.groups, g.id, (grp) => ({ ...grp, activeFile: remarkablePath })),
          activeGroupId: g.id,
        });
        return;
      }
    }

    const { connection, password, status } = useRemarkableStore.getState();
    if (status !== "connected") {
      useToastStore.getState().addToast("Not connected to reMarkable device", "error");
      return;
    }

    try {
      const content = await remarkableService.readFileContent(
        connection.host,
        connection.port,
        connection.username,
        password,
        fileId
      );
      set({
        groups: updateGroup(state.groups, group.id, (g) => ({
          ...g,
          openFiles: [...g.openFiles, { path: remarkablePath, content, dirty: false }],
          activeFile: remarkablePath,
        })),
      });
    } catch (e: unknown) {
      useToastStore.getState().addToast(
        `Failed to open "${visibleName}": ${String(e)}`,
        "error"
      );
    }
  },

  closeFile: (path: string) => {
    const state = get();
    // Find which group has the file
    const groupWithFile = state.groups.find((g) => g.openFiles.some((f) => f.path === path));
    if (!groupWithFile) return;

    const filtered = groupWithFile.openFiles.filter((f) => f.path !== path);
    const newActive =
      groupWithFile.activeFile === path
        ? filtered.length > 0
          ? filtered[filtered.length - 1].path
          : null
        : groupWithFile.activeFile;

    const newGroups = updateGroup(state.groups, groupWithFile.id, (g) => ({
      ...g,
      openFiles: filtered,
      activeFile: newActive,
    }));

    const cleaned = cleanEmptyGroups(newGroups, state.activeGroupId);
    set(cleaned);
  },

  setActiveFile: (path: string) => {
    const state = get();
    // Find which group has this file
    const group = state.groups.find((g) => g.openFiles.some((f) => f.path === path));
    if (!group) return;
    set({
      groups: updateGroup(state.groups, group.id, (g) => ({ ...g, activeFile: path })),
      activeGroupId: group.id,
    });
  },

  updateContent: (path: string, content: string) => {
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        openFiles: g.openFiles.map((f) =>
          f.path === path ? { ...f, content, dirty: true } : f
        ),
      })),
    }));
  },

  saveFile: async (vaultRoot: string, path: string) => {
    const state = get();
    // Find file in any group
    let file: OpenFile | undefined;
    for (const g of state.groups) {
      file = g.openFiles.find((f) => f.path === path);
      if (file) break;
    }
    if (!file) return;

    // Normalize line endings to LF for cross-platform consistency
    const normalizedContent = file.content.replace(/\r\n/g, "\n");

    try {
      if (path.startsWith("remarkable://")) {
        // Extract fileId from remarkable://{fileId}/{visibleName}
        const fileId = path.replace("remarkable://", "").split("/")[0];
        const { connection, password } = useRemarkableStore.getState();
        await remarkableService.writeFileContent(
          connection.host,
          connection.port,
          connection.username,
          password,
          fileId,
          normalizedContent
        );
      } else {
        await fileService.writeFile(vaultRoot, path, normalizedContent);
      }
    } catch (e: unknown) {
      const name = path.replace(/\\/g, "/").split("/").pop() || path;
      useToastStore.getState().addToast(
        `Failed to save "${name}": ${String(e)}`,
        "error"
      );
      return;
    }
    set((state) => ({
      groups: state.groups.map((g) => ({
        ...g,
        openFiles: g.openFiles.map((f) =>
          f.path === path ? { ...f, dirty: false } : f
        ),
      })),
    }));
  },

  setViewMode: (mode: "edit" | "preview" | "split") => {
    set({ viewMode: mode });
  },

  setActiveGroup: (groupId: string) => {
    set({ activeGroupId: groupId });
  },

  splitFileToGroup: (path: string) => {
    const state = get();
    // Find the file in any group
    let sourceGroup: EditorGroup | undefined;
    let file: OpenFile | undefined;
    for (const g of state.groups) {
      file = g.openFiles.find((f) => f.path === path);
      if (file) {
        sourceGroup = g;
        break;
      }
    }
    if (!sourceGroup || !file) return;

    // Remove from source group
    const filteredFiles = sourceGroup.openFiles.filter((f) => f.path !== path);
    const newSourceActive =
      sourceGroup.activeFile === path
        ? filteredFiles.length > 0
          ? filteredFiles[filteredFiles.length - 1].path
          : null
        : sourceGroup.activeFile;

    // Create new group with the file
    const newGroupId = nextGroupId();
    const newGroup: EditorGroup = {
      id: newGroupId,
      openFiles: [file],
      activeFile: path,
    };

    const updatedGroups = updateGroup(state.groups, sourceGroup.id, (g) => ({
      ...g,
      openFiles: filteredFiles,
      activeFile: newSourceActive,
    }));

    // Insert new group after the source group
    const idx = updatedGroups.findIndex((g) => g.id === sourceGroup!.id);
    updatedGroups.splice(idx + 1, 0, newGroup);

    const cleaned = cleanEmptyGroups(updatedGroups, newGroupId);
    set({ ...cleaned, activeGroupId: newGroupId });
  },

  moveFileToGroup: (path: string, targetGroupId: string) => {
    const state = get();
    // Find file source
    let sourceGroup: EditorGroup | undefined;
    let file: OpenFile | undefined;
    for (const g of state.groups) {
      file = g.openFiles.find((f) => f.path === path);
      if (file) {
        sourceGroup = g;
        break;
      }
    }
    if (!sourceGroup || !file) return;
    if (sourceGroup.id === targetGroupId) return;

    // Check target already has the file
    const target = state.groups.find((g) => g.id === targetGroupId);
    if (!target) return;
    if (target.openFiles.some((f) => f.path === path)) {
      // Already open in target, just activate
      const newGroups = state.groups.map((g) => {
        if (g.id === targetGroupId) return { ...g, activeFile: path };
        return g;
      });
      set({ groups: newGroups, activeGroupId: targetGroupId });
      return;
    }

    // Remove from source
    const filteredSource = sourceGroup.openFiles.filter((f) => f.path !== path);
    const newSourceActive =
      sourceGroup.activeFile === path
        ? filteredSource.length > 0
          ? filteredSource[filteredSource.length - 1].path
          : null
        : sourceGroup.activeFile;

    const newGroups = state.groups.map((g) => {
      if (g.id === sourceGroup!.id) return { ...g, openFiles: filteredSource, activeFile: newSourceActive };
      if (g.id === targetGroupId) return { ...g, openFiles: [...g.openFiles, file!], activeFile: path };
      return g;
    });

    const cleaned = cleanEmptyGroups(newGroups, targetGroupId);
    set({ ...cleaned, activeGroupId: targetGroupId });
  },

  closeGroup: (groupId: string) => {
    const state = get();
    if (state.groups.length <= 1) return;
    const newGroups = state.groups.filter((g) => g.id !== groupId);
    const newActiveId = newGroups.find((g) => g.id === state.activeGroupId)?.id || newGroups[0].id;
    set({ groups: newGroups, activeGroupId: newActiveId });
  },
};});
