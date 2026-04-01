import { create } from "zustand";
import * as fileService from "../services/tauriFileService";

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

interface EditorStore {
  openFiles: OpenFile[];
  activeFile: string | null;
  viewMode: "edit" | "preview" | "split";

  openFile: (vaultRoot: string, path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (vaultRoot: string, path: string) => Promise<void>;
  setViewMode: (mode: "edit" | "preview" | "split") => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  openFiles: [],
  activeFile: null,
  viewMode: "split",

  openFile: async (vaultRoot: string, path: string) => {
    const { openFiles } = get();
    const existing = openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFile: path });
      return;
    }

    const result = await fileService.readFile(vaultRoot, path);
    set({
      openFiles: [
        ...openFiles,
        { path, content: result.content, dirty: false },
      ],
      activeFile: path,
    });
  },

  closeFile: (path: string) => {
    const { openFiles, activeFile } = get();
    const filtered = openFiles.filter((f) => f.path !== path);
    const newActive =
      activeFile === path
        ? filtered.length > 0
          ? filtered[filtered.length - 1].path
          : null
        : activeFile;
    set({ openFiles: filtered, activeFile: newActive });
  },

  setActiveFile: (path: string) => {
    set({ activeFile: path });
  },

  updateContent: (path: string, content: string) => {
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, content, dirty: true } : f
      ),
    }));
  },

  saveFile: async (vaultRoot: string, path: string) => {
    const { openFiles } = get();
    const file = openFiles.find((f) => f.path === path);
    if (!file) return;

    await fileService.writeFile(vaultRoot, path, file.content);
    set((state) => ({
      openFiles: state.openFiles.map((f) =>
        f.path === path ? { ...f, dirty: false } : f
      ),
    }));
  },

  setViewMode: (mode: "edit" | "preview" | "split") => {
    set({ viewMode: mode });
  },
}));
