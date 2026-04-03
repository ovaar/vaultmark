import { invoke } from "@tauri-apps/api/core";
import type { RemarkableDevice, RemarkableEntry, SyncItem, SyncResult } from "../types/remarkable";

export async function testConnection(
  host: string,
  port: number,
  username: string,
  password: string
): Promise<RemarkableDevice> {
  return invoke("remarkable_test_connection", { host, port, username, password });
}

export async function listFiles(
  host: string,
  port: number,
  username: string,
  password: string
): Promise<RemarkableEntry[]> {
  return invoke("remarkable_list_files", { host, port, username, password });
}

export async function downloadFile(
  host: string,
  port: number,
  username: string,
  password: string,
  fileId: string,
  destPath: string
): Promise<void> {
  return invoke("remarkable_download_file", {
    host,
    port,
    username,
    password,
    fileId,
    destPath,
  });
}

export async function uploadFile(
  host: string,
  port: number,
  username: string,
  password: string,
  localPath: string,
  visibleName: string,
  parentId: string
): Promise<string> {
  return invoke("remarkable_upload_file", {
    host,
    port,
    username,
    password,
    localPath,
    visibleName,
    parentId,
  });
}

export async function readFileContent(
  host: string,
  port: number,
  username: string,
  password: string,
  fileId: string
): Promise<string> {
  return invoke("remarkable_read_file_content", {
    host,
    port,
    username,
    password,
    fileId,
  });
}

export async function writeFileContent(
  host: string,
  port: number,
  username: string,
  password: string,
  fileId: string,
  content: string
): Promise<void> {
  return invoke("remarkable_write_file_content", {
    host,
    port,
    username,
    password,
    fileId,
    content,
  });
}

export async function computeSyncPlan(
  host: string,
  port: number,
  username: string,
  password: string,
  vaultRoot: string
): Promise<SyncItem[]> {
  return invoke("remarkable_compute_sync_plan", {
    host,
    port,
    username,
    password,
    vaultRoot,
  });
}

export async function executeSync(
  host: string,
  port: number,
  username: string,
  password: string,
  vaultRoot: string,
  items: SyncItem[]
): Promise<SyncResult> {
  return invoke("remarkable_execute_sync", {
    host,
    port,
    username,
    password,
    vaultRoot,
    items,
  });
}
