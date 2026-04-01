using TypeSpec.Http;
using TypeSpec.Rest;

namespace VaultMark;

@route("/files")
@tag("Files")
interface FileOperations {
  @doc("List files in a directory")
  @get
  list(@query path: string): FileEntry[];

  @doc("Get the full file tree for a vault")
  @route("/tree")
  @get
  getTree(): FileEntry[];

  @doc("Read file content")
  @route("/{path}")
  @get
  read(@path path: string): FileContent;

  @doc("Create or update a file")
  @put
  write(@body body: WriteFileRequest): void;

  @doc("Delete a file or directory")
  @route("/{path}")
  @delete
  remove(@path path: string): void;

  @doc("Rename or move a file")
  @route("/rename")
  @post
  rename(@body body: RenameFileRequest): void;
}

@route("/directories")
@tag("Directories")
interface DirectoryOperations {
  @doc("List directory contents")
  @get
  list(@query path: string): FileEntry[];

  @doc("Create a new directory")
  @post
  create(@body body: CreateDirectoryRequest): void;

  @doc("Delete a directory")
  @route("/{path}")
  @delete
  remove(@path path: string): void;
}
