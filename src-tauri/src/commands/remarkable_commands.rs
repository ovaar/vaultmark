use crate::errors::AppError;
use crate::models::remarkable::{RemarkableDevice, RemarkableEntry};
use crate::services::remarkable_service;

#[tauri::command]
pub fn remarkable_test_connection(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
) -> Result<RemarkableDevice, AppError> {
    remarkable_service::test_connection(host, port, username, password)
}

#[tauri::command]
pub fn remarkable_list_files(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
) -> Result<Vec<RemarkableEntry>, AppError> {
    remarkable_service::list_files(host, port, username, password)
}

#[tauri::command]
pub fn remarkable_download_file(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    file_id: &str,
    dest_path: &str,
) -> Result<(), AppError> {
    remarkable_service::download_file(host, port, username, password, file_id, dest_path)
}

#[tauri::command]
pub fn remarkable_upload_file(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    local_path: &str,
    visible_name: &str,
    parent_id: &str,
) -> Result<String, AppError> {
    remarkable_service::upload_file(host, port, username, password, local_path, visible_name, parent_id)
}
