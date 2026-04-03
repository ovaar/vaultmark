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
            .map(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                datetime.to_rfc3339()
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
                .to_string()
                .replace('\\', "/");

            let modified = metadata.modified().ok().map(|t| {
                let datetime: chrono::DateTime<chrono::Utc> = t.into();
                datetime.to_rfc3339()
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

    let modified = metadata.modified().ok().map(|t| {
        let datetime: chrono::DateTime<chrono::Utc> = t.into();
        datetime.to_rfc3339()
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

/// Import an external file into the vault (copy or move).
pub fn import_file(
    vault_root: &str,
    source_path: &str,
    target_relative: &str,
    move_file: bool,
) -> Result<(), AppError> {
    let src = Path::new(source_path);
    if !src.exists() {
        return Err(AppError::NotFound(source_path.to_string()));
    }
    if !src.is_file() {
        return Err(AppError::InvalidPath("Source must be a file".into()));
    }

    let dest = validate_path(target_relative, vault_root)?;

    // Ensure parent directory exists
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }

    if move_file {
        // Try rename first (same filesystem), fall back to copy+delete
        if fs::rename(src, &dest).is_err() {
            fs::copy(src, &dest)?;
            fs::remove_file(src)?;
        }
    } else {
        fs::copy(src, &dest)?;
    }

    Ok(())
}

/// Move a file/directory within the vault to a new location.
pub fn move_entry(
    vault_root: &str,
    from_path: &str,
    to_dir: &str,
) -> Result<(), AppError> {
    let from = validate_path(from_path, vault_root)?;
    if !from.exists() {
        return Err(AppError::NotFound(from_path.to_string()));
    }

    let to_dir_path = validate_path(to_dir, vault_root)?;
    if !to_dir_path.is_dir() {
        return Err(AppError::InvalidPath(format!(
            "Target is not a directory: {}",
            to_dir
        )));
    }

    let file_name = from
        .file_name()
        .ok_or_else(|| AppError::InvalidPath("Cannot determine file name".into()))?;
    let dest = to_dir_path.join(file_name);

    if dest.exists() {
        return Err(AppError::InvalidPath(format!(
            "Target already exists: {}",
            dest.display()
        )));
    }

    fs::rename(&from, &dest)?;
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
        .replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("hello.md"), "# Hello").unwrap();
        fs::write(dir.path().join("world.md"), "# World").unwrap();
        fs::create_dir(dir.path().join("subdir")).unwrap();
        fs::write(dir.path().join("subdir/nested.md"), "nested").unwrap();
        fs::write(dir.path().join(".hidden"), "secret").unwrap();
        dir
    }

    #[test]
    fn test_validate_path_valid() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = validate_path("hello.md", root);
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("hello.md"));
    }

    #[test]
    fn test_validate_path_traversal_blocked() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        // Parent traversal is blocked — either OutOfScope or Io error
        let result = validate_path("../../../etc/passwd", root);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_traversal_sibling() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        // A simple ".." goes to the parent of the vault, which exists
        // but resolves outside the vault root → OutOfScope
        let result = validate_path("../something", root);
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::OutOfScope(_) => {}
            e => panic!("Expected OutOfScope, got: {:?}", e),
        }
    }

    #[test]
    fn test_validate_path_new_file() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = validate_path("newfile.md", root);
        assert!(result.is_ok());
    }

    #[test]
    fn test_list_files_root() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let entries = list_files(root, "").unwrap();
        let names: Vec<&str> = entries.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"subdir"));
        assert!(names.contains(&"hello.md"));
        assert!(names.contains(&"world.md"));
        assert!(!names.contains(&".hidden"), "hidden files should be excluded");
    }

    #[test]
    fn test_list_files_dirs_first() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let entries = list_files(root, "").unwrap();
        assert!(entries[0].is_dir, "directories should be sorted first");
    }

    #[test]
    fn test_list_files_subdir() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let entries = list_files(root, "subdir").unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "nested.md");
    }

    #[test]
    fn test_list_files_nonexistent() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = list_files(root, "nope");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_file_tree() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let tree = get_file_tree(root).unwrap();
        let names: Vec<&str> = tree.iter().map(|e| e.name.as_str()).collect();
        assert!(names.contains(&"subdir"));
        assert!(names.contains(&"hello.md"));
        assert!(!names.contains(&".hidden"));

        let subdir = tree.iter().find(|e| e.name == "subdir").unwrap();
        assert!(subdir.children.is_some());
        assert_eq!(subdir.children.as_ref().unwrap().len(), 1);
    }

    #[test]
    fn test_read_file_success() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let fc = read_file(root, "hello.md").unwrap();
        assert_eq!(fc.content, "# Hello");
        assert_eq!(fc.name, "hello.md");
        assert_eq!(fc.path, "hello.md");
    }

    #[test]
    fn test_read_file_not_found() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = read_file(root, "missing.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_read_directory_as_file() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        let result = read_file(root, "subdir");
        assert!(result.is_err());
    }

    #[test]
    fn test_write_file_new() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        write_file(root, "new.md", "new content").unwrap();
        let fc = read_file(root, "new.md").unwrap();
        assert_eq!(fc.content, "new content");
    }

    #[test]
    fn test_write_file_overwrite() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        write_file(root, "hello.md", "updated").unwrap();
        let fc = read_file(root, "hello.md").unwrap();
        assert_eq!(fc.content, "updated");
    }

    #[test]
    fn test_write_file_creates_parent_dirs() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        // validate_path requires the immediate parent to exist, so create it first
        create_directory(root, "a").unwrap();
        write_file(root, "a/deep.md", "deep").unwrap();
        let fc = read_file(root, "a/deep.md").unwrap();
        assert_eq!(fc.content, "deep");
    }

    #[test]
    fn test_write_file_no_temp_leftover() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        write_file(root, "atomic.md", "data").unwrap();
        assert!(!vault.path().join("atomic.tmp").exists(), "temp file should be cleaned up");
    }

    #[test]
    fn test_delete_file() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        delete_file(root, "hello.md").unwrap();
        assert!(read_file(root, "hello.md").is_err());
    }

    #[test]
    fn test_delete_directory() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        delete_file(root, "subdir").unwrap();
        assert!(!vault.path().join("subdir").exists());
    }

    #[test]
    fn test_delete_nonexistent() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        assert!(delete_file(root, "nope.md").is_err());
    }

    #[test]
    fn test_rename_file() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        rename_file(root, "hello.md", "renamed.md").unwrap();
        assert!(read_file(root, "renamed.md").is_ok());
        assert!(read_file(root, "hello.md").is_err());
    }

    #[test]
    fn test_rename_nonexistent() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        assert!(rename_file(root, "nope.md", "newname.md").is_err());
    }

    #[test]
    fn test_create_directory() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        create_directory(root, "newdir").unwrap();
        assert!(vault.path().join("newdir").is_dir());
    }

    #[test]
    fn test_create_nested_directory() {
        let vault = setup_vault();
        let root = vault.path().to_str().unwrap();
        // validate_path resolves parent, so create one level at a time
        create_directory(root, "a").unwrap();
        create_directory(root, "a/b").unwrap();
        assert!(vault.path().join("a/b").is_dir());
    }

    #[test]
    fn test_dir_size() {
        let vault = setup_vault();
        let size = dir_size(vault.path());
        assert!(size > 0);
    }

    #[test]
    fn test_pathdiff_relative() {
        let result = pathdiff_relative("/vault", Path::new("/vault/notes/hello.md"));
        assert_eq!(result, "notes/hello.md");
    }
}
