import { invoke } from "@tauri-apps/api/core";

export interface StoredCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export async function saveRemarkableCredentials(
  vaultPath: string,
  host: string,
  port: number,
  username: string,
  password: string
): Promise<void> {
  return invoke("save_remarkable_credentials", {
    vaultPath,
    host,
    port,
    username,
    password,
  });
}

export async function loadRemarkableCredentials(
  vaultPath: string
): Promise<StoredCredentials | null> {
  return invoke("load_remarkable_credentials", { vaultPath });
}

export async function deleteRemarkableCredentials(
  vaultPath: string
): Promise<void> {
  return invoke("delete_remarkable_credentials", { vaultPath });
}
