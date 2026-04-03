import { invoke } from "@tauri-apps/api/core";
import type { RemarkableDevice, RemarkableEntry } from "../types/remarkable";

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
