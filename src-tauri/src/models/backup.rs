use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub vault_path: String,
    pub backup_path: String,
    pub created_at: String,
    pub size_bytes: u64,
}
