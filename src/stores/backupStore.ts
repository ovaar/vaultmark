import { create } from "zustand";
import type { BackupInfo } from "../types/backup";
import * as backupService from "../services/tauriBackupService";

export type BackupInterval = "off" | "30min" | "1h" | "4h" | "daily";

const INTERVAL_MS: Record<BackupInterval, number> = {
  off: 0,
  "30min": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

const BACKUP_SETTINGS_KEY = "vaultmark-auto-backup";

interface BackupStore {
  backups: BackupInfo[];
  loading: boolean;
  error: string | null;
  autoBackupInterval: BackupInterval;

  loadBackups: (vaultRoot: string) => Promise<void>;
  createBackup: (vaultRoot: string) => Promise<void>;
  restoreBackup: (vaultRoot: string, backupId: string) => Promise<void>;
  deleteBackup: (vaultRoot: string, backupId: string) => Promise<void>;
  setAutoBackupInterval: (interval: BackupInterval) => void;
  getIntervalMs: () => number;
  loadSettings: () => void;
}

export const useBackupStore = create<BackupStore>((set, get) => ({
  backups: [],
  loading: false,
  error: null,
  autoBackupInterval: "off",

  loadBackups: async (vaultRoot: string) => {
    set({ loading: true, error: null });
    try {
      const backups = await backupService.listBackups(vaultRoot);
      set({ backups, loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  createBackup: async (vaultRoot: string) => {
    set({ loading: true, error: null });
    try {
      await backupService.createBackup(vaultRoot);
      await get().loadBackups(vaultRoot);
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  restoreBackup: async (vaultRoot: string, backupId: string) => {
    set({ loading: true, error: null });
    try {
      await backupService.restoreBackup(vaultRoot, backupId);
      set({ loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  deleteBackup: async (vaultRoot: string, backupId: string) => {
    try {
      await backupService.deleteBackup(vaultRoot, backupId);
      await get().loadBackups(vaultRoot);
    } catch (e: unknown) {
      set({ error: String(e) });
    }
  },

  setAutoBackupInterval: (interval: BackupInterval) => {
    set({ autoBackupInterval: interval });
    try {
      localStorage.setItem(BACKUP_SETTINGS_KEY, interval);
    } catch {
      // localStorage may be unavailable
    }
  },

  getIntervalMs: () => {
    return INTERVAL_MS[get().autoBackupInterval];
  },

  loadSettings: () => {
    try {
      const saved = localStorage.getItem(BACKUP_SETTINGS_KEY) as BackupInterval | null;
      if (saved && saved in INTERVAL_MS) {
        set({ autoBackupInterval: saved });
      }
    } catch {
      // ignore
    }
  },
}));
