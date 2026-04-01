namespace VaultMark;

@doc("A file or directory entry in the vault")
model FileEntry {
  @doc("File or directory name")
  name: string;

  @doc("Relative path from vault root")
  path: string;

  @doc("Whether this entry is a directory")
  is_dir: boolean;

  @doc("File extension, if applicable")
  extension?: string;

  @doc("File size in bytes")
  size?: int64;

  @doc("Last modified timestamp (ISO 8601)")
  modified?: string;

  @doc("Child entries (for directories)")
  children?: FileEntry[];
}

@doc("File content with metadata")
model FileContent {
  @doc("Relative path from vault root")
  path: string;

  @doc("File name")
  name: string;

  @doc("Raw file content")
  content: string;

  @doc("Last modified timestamp (ISO 8601)")
  modified?: string;

  @doc("File size in bytes")
  size: int64;
}

@doc("Request to write or create a file")
model WriteFileRequest {
  @doc("Relative path from vault root")
  path: string;

  @doc("Content to write")
  content: string;
}

@doc("Request to rename/move a file")
model RenameFileRequest {
  @doc("Current relative path")
  from: string;

  @doc("New relative path")
  to: string;
}

@doc("Request to create a directory")
model CreateDirectoryRequest {
  @doc("Relative path for the new directory")
  path: string;
}
