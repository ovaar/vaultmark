import { create } from "zustand";

export interface VaultInfo {
  path: string;
  name: string;
  lastOpened: string;
}

interface VaultStore {
  recentVaults: VaultInfo[];
  addVault: (path: string) => void;
  removeVault: (path: string) => void;
  loadFromStorage: () => void;
}

const STORAGE_KEY = "vaultmark-recent-vaults";

function vaultNameFromPath(path: string): string {
  const parts = path.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || "Vault";
}

function loadInitialVaults(): VaultInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as VaultInfo[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  recentVaults: loadInitialVaults(),

  addVault: (path: string) => {
    const { recentVaults } = get();
    const filtered = recentVaults.filter((v) => v.path !== path);
    const updated: VaultInfo[] = [
      { path, name: vaultNameFromPath(path), lastOpened: new Date().toISOString() },
      ...filtered,
    ].slice(0, 10); // Keep at most 10 recent vaults
    set({ recentVaults: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage may be unavailable
    }
  },

  removeVault: (path: string) => {
    const { recentVaults } = get();
    const updated = recentVaults.filter((v) => v.path !== path);
    set({ recentVaults: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage may be unavailable
    }
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VaultInfo[];
        set({ recentVaults: parsed });
      }
    } catch {
      // ignore parse errors
    }
  },
}));
