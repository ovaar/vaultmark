using TypeSpec.Http;
using TypeSpec.Rest;

namespace VaultMark;

@route("/backups")
@tag("Backups")
interface BackupOperations {
  @doc("List all backups for the current vault")
  @get
  list(): BackupInfo[];

  @doc("Create a new backup snapshot")
  @post
  create(): BackupInfo;

  @doc("Restore a vault from a backup")
  @route("/restore")
  @post
  restore(@body body: RestoreBackupRequest): void;

  @doc("Delete a specific backup")
  @route("/{backupId}")
  @delete
  remove(@path backupId: string): void;
}
