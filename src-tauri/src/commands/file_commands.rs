use crate::errors::AppError;
use crate::models::file::{FileContent, FileEntry};
use crate::services::file_service;

#[tauri::command]
pub fn list_files(vault_root: &str, path: &str) -> Result<Vec<FileEntry>, AppError> {
    file_service::list_files(vault_root, path)
}

#[tauri::command]
pub fn get_file_tree(vault_root: &str) -> Result<Vec<FileEntry>, AppError> {
    file_service::get_file_tree(vault_root)
}

#[tauri::command]
pub fn read_file(vault_root: &str, path: &str) -> Result<FileContent, AppError> {
    file_service::read_file(vault_root, path)
}

#[tauri::command]
pub fn write_file(vault_root: &str, path: &str, content: &str) -> Result<(), AppError> {
    file_service::write_file(vault_root, path, content)
}

#[tauri::command]
pub fn delete_file(vault_root: &str, path: &str) -> Result<(), AppError> {
    file_service::delete_file(vault_root, path)
}

#[tauri::command]
pub fn rename_file(vault_root: &str, from: &str, to: &str) -> Result<(), AppError> {
    file_service::rename_file(vault_root, from, to)
}

#[tauri::command]
pub fn create_directory(vault_root: &str, path: &str) -> Result<(), AppError> {
    file_service::create_directory(vault_root, path)
}
