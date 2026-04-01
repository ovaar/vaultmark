use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub size: Option<u64>,
    pub modified: Option<String>,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub name: String,
    pub content: String,
    pub modified: Option<String>,
    pub size: u64,
}
