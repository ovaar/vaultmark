use crate::errors::AppError;
use crate::models::backup::BackupInfo;
use crate::services::backup_service;

#[tauri::command]
pub fn create_backup(vault_root: &str) -> Result<BackupInfo, AppError> {
    backup_service::create_backup(vault_root)
}

#[tauri::command]
pub fn list_backups(vault_root: &str) -> Result<Vec<BackupInfo>, AppError> {
    backup_service::list_backups(vault_root)
}

#[tauri::command]
pub fn restore_backup(vault_root: &str, backup_id: &str) -> Result<(), AppError> {
    backup_service::restore_backup(vault_root, backup_id)
}

#[tauri::command]
pub fn delete_backup(vault_root: &str, backup_id: &str) -> Result<(), AppError> {
    backup_service::delete_backup(vault_root, backup_id)
}
