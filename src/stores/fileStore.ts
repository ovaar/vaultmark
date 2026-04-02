import { create } from "zustand";
import type { FileEntry } from "../types/file";
import * as fileService from "../services/tauriFileService";

interface FileStore {
  vaultRoot: string;
  fileTree: FileEntry[];
  selectedFile: string | null;
  loading: boolean;
  error: string | null;

  setVaultRoot: (path: string) => void;
  loadFileTree: () => Promise<void>;
  selectFile: (path: string | null) => void;
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (from: string, to: string) => Promise<void>;
  importFile: (sourcePath: string, targetRelative: string, move: boolean) => Promise<void>;
  moveEntry: (fromPath: string, toDir: string) => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => ({
  vaultRoot: "",
  fileTree: [],
  selectedFile: null,
  loading: false,
  error: null,

  setVaultRoot: (path: string) => {
    set({ vaultRoot: path });
  },

  loadFileTree: async () => {
    const { vaultRoot } = get();
    if (!vaultRoot) return;

    set({ loading: true, error: null });
    try {
      const tree = await fileService.getFileTree(vaultRoot);
      set({ fileTree: tree, loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  selectFile: (path: string | null) => {
    set({ selectedFile: path });
  },

  createFile: async (path: string) => {
    const { vaultRoot, loadFileTree } = get();
    await fileService.writeFile(vaultRoot, path, "");
    await loadFileTree();
    set({ selectedFile: path });
  },

  createFolder: async (path: string) => {
    const { vaultRoot, loadFileTree } = get();
    await fileService.createDirectory(vaultRoot, path);
    await loadFileTree();
  },

  deleteFile: async (path: string) => {
    const { vaultRoot, loadFileTree, selectedFile } = get();
    await fileService.deleteFile(vaultRoot, path);
    if (selectedFile === path) {
      set({ selectedFile: null });
    }
    await loadFileTree();
  },

  renameFile: async (from: string, to: string) => {
    const { vaultRoot, loadFileTree, selectedFile } = get();
    await fileService.renameFile(vaultRoot, from, to);
    if (selectedFile === from) {
      set({ selectedFile: to });
    }
    await loadFileTree();
  },

  importFile: async (sourcePath: string, targetRelative: string, move: boolean) => {
    const { vaultRoot, loadFileTree } = get();
    await fileService.importFile(vaultRoot, sourcePath, targetRelative, move);
    await loadFileTree();
  },

  moveEntry: async (fromPath: string, toDir: string) => {
    const { vaultRoot, loadFileTree, selectedFile } = get();
    await fileService.moveEntry(vaultRoot, fromPath, toDir);
    if (selectedFile === fromPath) {
      set({ selectedFile: null });
    }
    await loadFileTree();
  },
}));
