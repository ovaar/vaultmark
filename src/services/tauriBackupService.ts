import { invoke } from "@tauri-apps/api/core";
import type { BackupInfo } from "../types/backup";

export async function createBackup(vaultRoot: string): Promise<BackupInfo> {
  return invoke("create_backup", { vaultRoot });
}

export async function listBackups(vaultRoot: string): Promise<BackupInfo[]> {
  return invoke("list_backups", { vaultRoot });
}

export async function restoreBackup(
  vaultRoot: string,
  backupId: string
): Promise<void> {
  return invoke("restore_backup", { vaultRoot, backupId });
}

export async function deleteBackup(
  vaultRoot: string,
  backupId: string
): Promise<void> {
  return invoke("delete_backup", { vaultRoot, backupId });
}
