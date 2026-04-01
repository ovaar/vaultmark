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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("note.md"), "# Note").unwrap();
        fs::create_dir(dir.path().join("folder")).unwrap();
        fs::write(dir.path().join("folder/child.md"), "child").unwrap();
        dir
    }

    #[test]
    fn test_backups_dir_location() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let dir = backups_dir(root);
        let vault_name = vault.path().file_name().unwrap().to_string_lossy();
        assert!(dir.to_string_lossy().contains(&format!(".{}-backups", vault_name)));
        assert_eq!(dir.parent().unwrap(), vault.path().parent().unwrap());
    }

    #[test]
    fn test_create_backup() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let info = create_backup(root).unwrap();
        assert!(info.id.starts_with("backup_"));
        assert!(info.size_bytes > 0);
        assert!(Path::new(&info.backup_path).exists());
        // Verify backup content
        let backup_path = Path::new(&info.backup_path);
        assert!(backup_path.join("note.md").exists());
        assert!(backup_path.join("folder/child.md").exists());
    }

    #[test]
    fn test_create_backup_nonexistent_vault() {
        let result = create_backup("/tmp/nonexistent_vault_xyz_123");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_backups_empty() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let backups = list_backups(root).unwrap();
        assert!(backups.is_empty());
    }

    #[test]
    fn test_list_backups_after_create() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        create_backup(root).unwrap();
        let backups = list_backups(root).unwrap();
        assert_eq!(backups.len(), 1);
        assert!(backups[0].id.starts_with("backup_"));
    }

    #[test]
    fn test_restore_backup() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();

        let info = create_backup(root).unwrap();

        // Modify vault after backup
        fs::write(vault.path().join("note.md"), "modified").unwrap();
        fs::write(vault.path().join("extra.md"), "extra").unwrap();

        // Restore should bring back original content
        restore_backup(root, &info.id).unwrap();
        let content = fs::read_to_string(vault.path().join("note.md")).unwrap();
        assert_eq!(content, "# Note");
        // Extra file should be removed by restore
        assert!(!vault.path().join("extra.md").exists());
    }

    #[test]
    fn test_restore_nonexistent_backup() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = restore_backup(root, "backup_nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_backup() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let info = create_backup(root).unwrap();
        assert!(Path::new(&info.backup_path).exists());
        delete_backup(root, &info.id).unwrap();
        assert!(!Path::new(&info.backup_path).exists());
    }

    #[test]
    fn test_delete_nonexistent_backup() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = delete_backup(root, "backup_nope");
        assert!(result.is_err());
    }

    #[test]
    fn test_copy_dir_recursive_skips_hidden() {
        let src = TempDir::new().unwrap();
        let dst = TempDir::new().unwrap();
        fs::write(src.path().join("visible.md"), "v").unwrap();
        fs::write(src.path().join(".hidden"), "h").unwrap();
        copy_dir_recursive(src.path(), &dst.path().join("out")).unwrap();
        assert!(dst.path().join("out/visible.md").exists());
        assert!(!dst.path().join("out/.hidden").exists());
    }
}
