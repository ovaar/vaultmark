namespace VaultMark;

@doc("Backup snapshot metadata")
model BackupInfo {
  @doc("Unique backup identifier")
  id: string;

  @doc("Original vault path")
  vault_path: string;

  @doc("Path where backup is stored")
  backup_path: string;

  @doc("Creation timestamp (ISO 8601)")
  created_at: string;

  @doc("Total backup size in bytes")
  size_bytes: int64;
}

@doc("Request to restore a specific backup")
model RestoreBackupRequest {
  @doc("Backup ID to restore")
  backup_id: string;
}
