use crate::errors::AppError;
use crate::services::credential_service::{self, StoredCredentials};

#[tauri::command]
pub fn save_remarkable_credentials(
    vault_path: &str,
    host: &str,
    port: u16,
    username: &str,
    password: &str,
) -> Result<(), AppError> {
    let creds = StoredCredentials {
        host: host.to_string(),
        port,
        username: username.to_string(),
        password: password.to_string(),
    };
    credential_service::save_credentials(vault_path, &creds)
}

#[tauri::command]
pub fn load_remarkable_credentials(
    vault_path: &str,
) -> Result<Option<StoredCredentials>, AppError> {
    credential_service::load_credentials(vault_path)
}

#[tauri::command]
pub fn delete_remarkable_credentials(vault_path: &str) -> Result<(), AppError> {
    credential_service::delete_credentials(vault_path)
}
