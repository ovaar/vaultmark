import { create } from "zustand";
import type { BackupInfo } from "../types/backup";
import * as backupService from "../services/tauriBackupService";

interface BackupStore {
  backups: BackupInfo[];
  loading: boolean;
  error: string | null;

  loadBackups: (vaultRoot: string) => Promise<void>;
  createBackup: (vaultRoot: string) => Promise<void>;
  restoreBackup: (vaultRoot: string, backupId: string) => Promise<void>;
  deleteBackup: (vaultRoot: string, backupId: string) => Promise<void>;
}

export const useBackupStore = create<BackupStore>((set, get) => ({
  backups: [],
  loading: false,
  error: null,

  loadBackups: async (vaultRoot: string) => {
    set({ loading: true, error: null });
    try {
      const backups = await backupService.listBackups(vaultRoot);
      set({ backups, loading: false });
    } catch (e: any) {
      set({ error: String(e), loading: false });
    }
  },

  createBackup: async (vaultRoot: string) => {
    set({ loading: true, error: null });
    try {
      await backupService.createBackup(vaultRoot);
      await get().loadBackups(vaultRoot);
    } catch (e: any) {
      set({ error: String(e), loading: false });
    }
  },

  restoreBackup: async (vaultRoot: string, backupId: string) => {
    set({ loading: true, error: null });
    try {
      await backupService.restoreBackup(vaultRoot, backupId);
      set({ loading: false });
    } catch (e: any) {
      set({ error: String(e), loading: false });
    }
  },

  deleteBackup: async (vaultRoot: string, backupId: string) => {
    try {
      await backupService.deleteBackup(vaultRoot, backupId);
      await get().loadBackups(vaultRoot);
    } catch (e: any) {
      set({ error: String(e) });
    }
  },
}));
