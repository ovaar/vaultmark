import { useEffect, useRef } from "react";
import { useBackupStore } from "../stores/backupStore";
import { useFileStore } from "../stores/fileStore";

export function useAutoBackup() {
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const createBackup = useBackupStore((s) => s.createBackup);
  const getIntervalMs = useBackupStore((s) => s.getIntervalMs);
  const loadSettings = useBackupStore((s) => s.loadSettings);
  const autoBackupInterval = useBackupStore((s) => s.autoBackupInterval);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const ms = getIntervalMs();
    if (ms > 0 && vaultRoot) {
      timerRef.current = setInterval(() => {
        createBackup(vaultRoot);
      }, ms);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoBackupInterval, vaultRoot, createBackup, getIntervalMs]);
}
