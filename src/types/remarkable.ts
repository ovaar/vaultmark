export interface RemarkableConnection {
  host: string;
  port: number;
  username: string;
}

export interface RemarkableDevice {
  connected: boolean;
  hostname: string | null;
}

export interface RemarkableEntry {
  id: string;
  visible_name: string;
  entry_type: "document" | "collection";
  parent: string;
  last_modified: string;
  pinned: boolean;
}

export type SyncDirection = "Upload" | "Download" | "Conflict";

export interface SyncItem {
  name: string;
  local_path: string | null;
  remote_id: string | null;
  direction: SyncDirection;
  local_modified: string | null;
  remote_modified: string | null;
}

export interface SyncResult {
  uploaded: number;
  downloaded: number;
  conflicts: string[];
  errors: string[];
}
