use crate::errors::AppError;
use crate::models::file::{FileContent, FileEntry};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Validate that a path is within the allowed vault root.
fn validate_path(path: &str, vault_root: &str) -> Result<PathBuf, AppError> {
    let canonical_root = fs::canonicalize(vault_root).map_err(|_| {
        AppError::NotFound(format!("Vault root not found: {}", vault_root))
    })?;
    let target = canonical_root.join(path);

    // Resolve the target — if it doesn't exist yet, resolve the parent
    let resolved = if target.exists() {
        fs::canonicalize(&target)?
    } else {
        let parent = target.parent().ok_or_else(|| {
            AppError::InvalidPath("Cannot resolve parent directory".into())
        })?;
        let parent_resolved = fs::canonicalize(parent)?;
        parent_resolved.join(target.file_name().unwrap_or_default())
    };

    if !resolved.starts_with(&canonical_root) {
        return Err(AppError::OutOfScope(path.to_string()));
    }
    Ok(resolved)
}

pub fn list_files(vault_root: &str, relative_path: &str) -> Result<Vec<FileEntry>, AppError> {
    let dir = if relative_path.is_empty() {
        PathBuf::from(vault_root)
    } else {
        validate_path(relative_path, vault_root)?
    };

    if !dir.exists() {
        return Err(AppError::NotFound(format!(
            "Directory not found: {}",
            dir.display()
        )));
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories
        if name.starts_with('.') {
            continue;
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                Some(datetime.to_rfc3339())
            });

        let extension = Path::new(&name)
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        let rel_path = pathdiff_relative(vault_root, &entry.path());

        entries.push(FileEntry {
            name,
            path: rel_path,
            is_dir: metadata.is_dir(),
            extension,
            size: if metadata.is_file() {
                Some(metadata.len())
            } else {
                None
            },
            modified,
            children: None,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

pub fn get_file_tree(vault_root: &str) -> Result<Vec<FileEntry>, AppError> {
    fn build_tree(dir: &Path, root: &Path) -> Result<Vec<FileEntry>, AppError> {
        let mut entries = Vec::new();
        if !dir.exists() {
            return Ok(entries);
        }

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            let name = entry.file_name().to_string_lossy().to_string();

            if name.starts_with('.') {
                continue;
            }

            let rel_path = entry
                .path()
                .strip_prefix(root)
                .unwrap_or(entry.path().as_path())
                .to_string_lossy()
                .to_string();

            let modified = metadata.modified().ok().and_then(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                Some(datetime.to_rfc3339())
            });

            let extension = Path::new(&name)
                .extension()
                .map(|e| e.to_string_lossy().to_string());

            let children = if metadata.is_dir() {
                Some(build_tree(&entry.path(), root)?)
            } else {
                None
            };

            entries.push(FileEntry {
                name,
                path: rel_path,
                is_dir: metadata.is_dir(),
                extension,
                size: if metadata.is_file() {
                    Some(metadata.len())
                } else {
                    None
                },
                modified,
                children,
            });
        }

        entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(entries)
    }

    let root = Path::new(vault_root);
    if !root.exists() {
        fs::create_dir_all(root)?;
    }
    build_tree(root, root)
}

pub fn read_file(vault_root: &str, relative_path: &str) -> Result<FileContent, AppError> {
    let full_path = validate_path(relative_path, vault_root)?;

    if !full_path.exists() {
        return Err(AppError::NotFound(relative_path.to_string()));
    }
    if !full_path.is_file() {
        return Err(AppError::InvalidPath(format!(
            "Not a file: {}",
            relative_path
        )));
    }

    let metadata = fs::metadata(&full_path)?;
    let content = fs::read_to_string(&full_path)?;
    let name = full_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let modified = metadata.modified().ok().and_then(|t| {
        let datetime: chrono::DateTime<chrono::Utc> = t.into();
        Some(datetime.to_rfc3339())
    });

    Ok(FileContent {
        path: relative_path.to_string(),
        name,
        content,
        modified,
        size: metadata.len(),
    })
}

pub fn write_file(
    vault_root: &str,
    relative_path: &str,
    content: &str,
) -> Result<(), AppError> {
    let full_path = validate_path(relative_path, vault_root)?;

    // Ensure parent directories exist
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Atomic write: write to temp file, then rename
    let temp_path = full_path.with_extension("tmp");
    fs::write(&temp_path, content)?;
    fs::rename(&temp_path, &full_path)?;

    Ok(())
}

pub fn delete_file(vault_root: &str, relative_path: &str) -> Result<(), AppError> {
    let full_path = validate_path(relative_path, vault_root)?;

    if !full_path.exists() {
        return Err(AppError::NotFound(relative_path.to_string()));
    }

    if full_path.is_dir() {
        fs::remove_dir_all(&full_path)?;
    } else {
        fs::remove_file(&full_path)?;
    }

    Ok(())
}

pub fn rename_file(
    vault_root: &str,
    from_path: &str,
    to_path: &str,
) -> Result<(), AppError> {
    let from = validate_path(from_path, vault_root)?;
    let to = validate_path(to_path, vault_root)?;

    if !from.exists() {
        return Err(AppError::NotFound(from_path.to_string()));
    }

    // Ensure target parent exists
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::rename(&from, &to)?;
    Ok(())
}

pub fn create_directory(vault_root: &str, relative_path: &str) -> Result<(), AppError> {
    let full_path = validate_path(relative_path, vault_root)?;
    fs::create_dir_all(&full_path)?;
    Ok(())
}

/// Calculate size of a directory recursively
pub fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

/// Compute a relative path from `root` to `path`
fn pathdiff_relative(root: &str, path: &Path) -> String {
    let root_path = Path::new(root);
    path.strip_prefix(root_path)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string()
}
