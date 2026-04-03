use serde::{Deserialize, Serialize};

/// Connection configuration for a reMarkable device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemarkableConnection {
    pub host: String,
    pub port: u16,
    pub username: String,
}

/// Information about a connected reMarkable device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemarkableDevice {
    pub connected: bool,
    pub hostname: Option<String>,
}

/// A file/folder entry on the reMarkable device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemarkableEntry {
    pub id: String,
    pub visible_name: String,
    pub entry_type: RemarkableEntryType,
    pub parent: String,
    pub last_modified: String,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RemarkableEntryType {
    Document,
    Collection,
}

/// Metadata format as stored on the reMarkable device (.metadata files)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XochitlMetadata {
    pub visible_name: Option<String>,
    #[serde(rename = "type")]
    pub entry_type: Option<String>,
    pub parent: Option<String>,
    pub last_modified: Option<serde_json::Value>,
    pub pinned: Option<bool>,
    pub deleted: Option<bool>,
}
