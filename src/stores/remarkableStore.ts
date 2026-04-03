import { create } from "zustand";
import type { RemarkableConnection, RemarkableEntry } from "../types/remarkable";
import * as remarkableService from "../services/tauriRemarkableService";

const CONNECTION_KEY = "vaultmark-remarkable-connection";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface RemarkableStore {
  connection: RemarkableConnection;
  password: string;
  status: ConnectionStatus;
  hostname: string | null;
  error: string | null;
  entries: RemarkableEntry[];
  loadingFiles: boolean;

  setConnection: (conn: Partial<RemarkableConnection>) => void;
  setPassword: (password: string) => void;
  testConnection: () => Promise<boolean>;
  disconnect: () => void;
  loadFiles: () => Promise<void>;
  loadSavedConnection: () => void;
}

export const useRemarkableStore = create<RemarkableStore>((set, get) => ({
  connection: { host: "10.11.99.1", port: 22, username: "root" },
  password: "",
  status: "disconnected",
  hostname: null,
  error: null,
  entries: [],
  loadingFiles: false,

  setConnection: (conn) => {
    set((state) => ({
      connection: { ...state.connection, ...conn },
    }));
  },

  setPassword: (password) => {
    set({ password });
  },

  testConnection: async () => {
    const { connection, password } = get();
    set({ status: "connecting", error: null });

    try {
      const device = await remarkableService.testConnection(
        connection.host,
        connection.port,
        connection.username,
        password
      );
      set({
        status: "connected",
        hostname: device.hostname,
      });

      // Persist connection (not password) to localStorage
      try {
        localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
      } catch {
        // ignore storage errors
      }

      return true;
    } catch (e: unknown) {
      set({ status: "error", error: String(e) });
      return false;
    }
  },

  disconnect: () => {
    set({
      status: "disconnected",
      hostname: null,
      error: null,
      entries: [],
      password: "",
    });
  },

  loadFiles: async () => {
    const { connection, password, status } = get();
    if (status !== "connected") return;

    set({ loadingFiles: true, error: null });

    try {
      const entries = await remarkableService.listFiles(
        connection.host,
        connection.port,
        connection.username,
        password
      );
      set({ entries, loadingFiles: false });
    } catch (e: unknown) {
      set({ error: String(e), loadingFiles: false });
    }
  },

  loadSavedConnection: () => {
    try {
      const saved = localStorage.getItem(CONNECTION_KEY);
      if (saved) {
        const conn = JSON.parse(saved) as RemarkableConnection;
        set({ connection: conn });
      }
    } catch {
      // ignore parse errors
    }
  },
}));
