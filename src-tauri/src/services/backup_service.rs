use crate::errors::AppError;
use crate::models::backup::BackupInfo;
use crate::services::file_service;
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};

fn backups_dir(vault_root: &str) -> PathBuf {
    let vault_path = Path::new(vault_root);
    let vault_name = vault_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    vault_path
        .parent()
        .unwrap_or(vault_path)
        .join(format!(".{}-backups", vault_name))
}

pub fn create_backup(vault_root: &str) -> Result<BackupInfo, AppError> {
    let vault_path = Path::new(vault_root);
    if !vault_path.exists() {
        return Err(AppError::NotFound(vault_root.to_string()));
    }

    let backups = backups_dir(vault_root);
    fs::create_dir_all(&backups)?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_id = format!("backup_{}", timestamp);
    let backup_path = backups.join(&backup_id);

    copy_dir_recursive(vault_path, &backup_path)?;

    let size_bytes = file_service::dir_size(&backup_path);

    Ok(BackupInfo {
        id: backup_id,
        vault_path: vault_root.to_string(),
        backup_path: backup_path.to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        size_bytes,
    })
}

pub fn list_backups(vault_root: &str) -> Result<Vec<BackupInfo>, AppError> {
    let backups = backups_dir(vault_root);
    if !backups.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();
    for entry in fs::read_dir(&backups)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("backup_") {
            continue;
        }

        let metadata = entry.metadata()?;
        let created_at = metadata
            .modified()
            .ok()
            .map(|t| {
                let dt: chrono::DateTime<Utc> = t.into();
                dt.to_rfc3339()
            })
            .unwrap_or_default();

        let size_bytes = file_service::dir_size(&entry.path());

        result.push(BackupInfo {
            id: name,
            vault_path: vault_root.to_string(),
            backup_path: entry.path().to_string_lossy().to_string(),
            created_at,
            size_bytes,
        });
    }

    result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(result)
}

pub fn restore_backup(vault_root: &str, backup_id: &str) -> Result<(), AppError> {
    let backups = backups_dir(vault_root);
    let backup_path = backups.join(backup_id);

    if !backup_path.exists() {
        return Err(AppError::Backup(format!(
            "Backup not found: {}",
            backup_id
        )));
    }

    let vault_path = Path::new(vault_root);

    // Clear current vault contents (but not the backup dir itself)
    if vault_path.exists() {
        for entry in fs::read_dir(vault_path)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue; // preserve hidden dirs
            }
            if entry.file_type()?.is_dir() {
                fs::remove_dir_all(entry.path())?;
            } else {
                fs::remove_file(entry.path())?;
            }
        }
    }

    // Copy backup contents into vault
    copy_dir_recursive(&backup_path, vault_path)?;

    Ok(())
}

pub fn delete_backup(vault_root: &str, backup_id: &str) -> Result<(), AppError> {
    let backups = backups_dir(vault_root);
    let backup_path = backups.join(backup_id);

    if !backup_path.exists() {
        return Err(AppError::Backup(format!(
            "Backup not found: {}",
            backup_id
        )));
    }

    fs::remove_dir_all(&backup_path)?;
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs and backup dirs
        if name.starts_with('.') {
            continue;
        }

        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
