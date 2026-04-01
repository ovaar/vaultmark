import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, FileContent } from "../types/file";

export async function listFiles(
  vaultRoot: string,
  path: string
): Promise<FileEntry[]> {
  return invoke("list_files", { vaultRoot, path });
}

export async function getFileTree(vaultRoot: string): Promise<FileEntry[]> {
  return invoke("get_file_tree", { vaultRoot });
}

export async function readFile(
  vaultRoot: string,
  path: string
): Promise<FileContent> {
  return invoke("read_file", { vaultRoot, path });
}

export async function writeFile(
  vaultRoot: string,
  path: string,
  content: string
): Promise<void> {
  return invoke("write_file", { vaultRoot, path, content });
}

export async function deleteFile(
  vaultRoot: string,
  path: string
): Promise<void> {
  return invoke("delete_file", { vaultRoot, path });
}

export async function renameFile(
  vaultRoot: string,
  from: string,
  to: string
): Promise<void> {
  return invoke("rename_file", { vaultRoot, from, to });
}

export async function createDirectory(
  vaultRoot: string,
  path: string
): Promise<void> {
  return invoke("create_directory", { vaultRoot, path });
}
