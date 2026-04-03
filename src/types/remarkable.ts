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
