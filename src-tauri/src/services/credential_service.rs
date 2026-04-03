use crate::errors::AppError;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "com.vaultmark.remarkable";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredCredentials {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

/// Build a keyring entry scoped to a specific vault path.
fn entry_for_vault(vault_path: &str) -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(SERVICE_NAME, vault_path)
        .map_err(|e| AppError::Remarkable(format!("Failed to access credential store: {}", e)))
}

/// Save reMarkable connection credentials for a specific vault.
pub fn save_credentials(vault_path: &str, creds: &StoredCredentials) -> Result<(), AppError> {
    let entry = entry_for_vault(vault_path)?;
    let json = serde_json::to_string(creds)
        .map_err(|e| AppError::Remarkable(format!("Failed to serialize credentials: {}", e)))?;
    entry
        .set_password(&json)
        .map_err(|e| AppError::Remarkable(format!("Failed to save credentials: {}", e)))
}

/// Load reMarkable connection credentials for a specific vault.
/// Returns None if no credentials are stored.
pub fn load_credentials(vault_path: &str) -> Result<Option<StoredCredentials>, AppError> {
    let entry = entry_for_vault(vault_path)?;
    match entry.get_password() {
        Ok(json) => {
            let creds: StoredCredentials = serde_json::from_str(&json).map_err(|e| {
                AppError::Remarkable(format!("Failed to parse stored credentials: {}", e))
            })?;
            Ok(Some(creds))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Remarkable(format!(
            "Failed to load credentials: {}",
            e
        ))),
    }
}

/// Delete stored reMarkable credentials for a specific vault.
pub fn delete_credentials(vault_path: &str) -> Result<(), AppError> {
    let entry = entry_for_vault(vault_path)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already gone, not an error
        Err(e) => Err(AppError::Remarkable(format!(
            "Failed to delete credentials: {}",
            e
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stored_credentials_serialization() {
        let creds = StoredCredentials {
            host: "10.11.99.1".to_string(),
            port: 22,
            username: "root".to_string(),
            password: "secret123".to_string(),
        };
        let json = serde_json::to_string(&creds).unwrap();
        let parsed: StoredCredentials = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.host, "10.11.99.1");
        assert_eq!(parsed.port, 22);
        assert_eq!(parsed.username, "root");
        assert_eq!(parsed.password, "secret123");
    }
}
