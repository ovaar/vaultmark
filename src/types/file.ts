export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
  size: number | null;
  modified: string | null;
  children: FileEntry[] | null;
}

export interface FileContent {
  path: string;
  name: string;
  content: string;
  modified: string | null;
  size: number;
}
