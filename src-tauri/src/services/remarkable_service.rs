use crate::errors::AppError;
use crate::models::remarkable::{
    RemarkableDevice, RemarkableEntry, RemarkableEntryType, XochitlMetadata,
};
use ssh2::Session;
use std::io::Read;
use std::net::TcpStream;
use std::time::Duration;

const XOCHITL_PATH: &str = "/home/root/.local/share/remarkable/xochitl";

/// Test SSH connection to a reMarkable device
pub fn test_connection(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
) -> Result<RemarkableDevice, AppError> {
    let session = connect(host, port, username, password)?;

    let hostname = exec_command(&session, "hostname").ok();

    session.disconnect(None, "done", None).ok();

    Ok(RemarkableDevice {
        connected: true,
        hostname,
    })
}

/// List files on the reMarkable device
pub fn list_files(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
) -> Result<Vec<RemarkableEntry>, AppError> {
    let session = connect(host, port, username, password)?;

    // Read all metadata files in one command using a delimiter-based format
    let output = exec_command(
        &session,
        &format!(
            r#"cd {path} 2>/dev/null && for f in *.metadata; do [ -f "$f" ] || continue; uuid="${{f%.metadata}}"; printf '<<BEGIN:%s>>\n' "$uuid"; cat "$f"; printf '\n<<END>>\n'; done"#,
            path = XOCHITL_PATH
        ),
    )?;

    let entries = parse_metadata_output(&output);

    session.disconnect(None, "done", None).ok();

    Ok(entries)
}

/// Download a file from the reMarkable to a local path via SFTP
pub fn download_file(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    file_id: &str,
    dest_path: &str,
) -> Result<(), AppError> {
    let session = connect(host, port, username, password)?;
    let sftp = session
        .sftp()
        .map_err(|e| AppError::Remarkable(format!("Failed to open SFTP: {}", e)))?;

    // The main document content is in the .content file and the pages are in {uuid}/ dir
    // For now, download the raw content/metadata as a bundle
    let remote_metadata = format!("{}/{}.metadata", XOCHITL_PATH, file_id);
    let remote_content = format!("{}/{}.content", XOCHITL_PATH, file_id);

    let dest = std::path::Path::new(dest_path);
    std::fs::create_dir_all(dest)
        .map_err(|e| AppError::Remarkable(format!("Failed to create destination: {}", e)))?;

    download_sftp_file(&sftp, &remote_metadata, &dest.join(format!("{}.metadata", file_id)))?;

    // .content may not exist for all entries
    if let Ok(mut f) = sftp.open(std::path::Path::new(&remote_content)) {
        let mut buf = Vec::new();
        f.read_to_end(&mut buf)
            .map_err(|e| AppError::Remarkable(format!("Read error: {}", e)))?;
        std::fs::write(dest.join(format!("{}.content", file_id)), &buf)
            .map_err(|e| AppError::Remarkable(format!("Write error: {}", e)))?;
    }

    session.disconnect(None, "done", None).ok();
    Ok(())
}

/// Upload a markdown file to the reMarkable as a plain-text document
pub fn upload_file(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    local_path: &str,
    visible_name: &str,
    parent_id: &str,
) -> Result<String, AppError> {
    let session = connect(host, port, username, password)?;

    // Generate a UUID for the new document
    let uuid_output = exec_command(&session, "cat /proc/sys/kernel/random/uuid")?;
    let uuid = uuid_output.trim().to_string();

    if uuid.is_empty() {
        return Err(AppError::Remarkable("Failed to generate UUID".into()));
    }

    let content = std::fs::read_to_string(local_path)
        .map_err(|e| AppError::Remarkable(format!("Failed to read local file: {}", e)))?;

    let sftp = session
        .sftp()
        .map_err(|e| AppError::Remarkable(format!("Failed to open SFTP: {}", e)))?;

    // Write metadata
    let metadata = serde_json::json!({
        "deleted": false,
        "lastModified": chrono::Utc::now().timestamp_millis().to_string(),
        "lastOpened": "",
        "lastOpenedPage": 0,
        "metadatamodified": false,
        "modified": true,
        "parent": parent_id,
        "pinned": false,
        "synced": false,
        "type": "DocumentType",
        "version": 0,
        "visibleName": visible_name
    });

    let metadata_path = format!("{}/{}.metadata", XOCHITL_PATH, uuid);
    write_sftp_file(&sftp, &metadata_path, metadata.to_string().as_bytes())?;

    // Write content descriptor
    let content_desc = serde_json::json!({
        "fileType": "epub",
        "formatVersion": 2,
        "pageCount": 1
    });

    let content_path = format!("{}/{}.content", XOCHITL_PATH, uuid);
    write_sftp_file(&sftp, &content_path, content_desc.to_string().as_bytes())?;

    // Store the raw text in a .txt file alongside
    let txt_path = format!("{}/{}.txt", XOCHITL_PATH, uuid);
    write_sftp_file(&sftp, &txt_path, content.as_bytes())?;

    // Restart xochitl so it picks up the new file
    exec_command(&session, "systemctl restart xochitl").ok();

    session.disconnect(None, "done", None).ok();

    Ok(uuid)
}

// ── Internal helpers ────────────────────────────────────────────────

fn connect(host: &str, port: u16, username: &str, password: &str) -> Result<Session, AppError> {
    let addr = format!("{}:{}", host, port);
    let tcp = TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e| AppError::Remarkable(format!("Invalid address {}: {}", addr, e)))?,
        Duration::from_secs(10),
    )
    .map_err(|e| AppError::Remarkable(format!("Failed to connect to {}: {}", addr, e)))?;

    tcp.set_read_timeout(Some(Duration::from_secs(30)))
        .map_err(|e| AppError::Remarkable(format!("Failed to set timeout: {}", e)))?;

    let mut session =
        Session::new().map_err(|e| AppError::Remarkable(format!("SSH session error: {}", e)))?;

    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| AppError::Remarkable(format!("SSH handshake failed: {}", e)))?;

    session
        .userauth_password(username, password)
        .map_err(|e| AppError::Remarkable(format!("Authentication failed: {}", e)))?;

    Ok(session)
}

fn exec_command(session: &Session, command: &str) -> Result<String, AppError> {
    let mut channel = session
        .channel_session()
        .map_err(|e| AppError::Remarkable(format!("Failed to open channel: {}", e)))?;

    channel
        .exec(command)
        .map_err(|e| AppError::Remarkable(format!("Failed to execute command: {}", e)))?;

    let mut output = String::new();
    channel
        .read_to_string(&mut output)
        .map_err(|e| AppError::Remarkable(format!("Failed to read output: {}", e)))?;

    channel.wait_close().ok();

    Ok(output.trim().to_string())
}

fn download_sftp_file(
    sftp: &ssh2::Sftp,
    remote_path: &str,
    local_path: &std::path::Path,
) -> Result<(), AppError> {
    let mut remote_file = sftp
        .open(std::path::Path::new(remote_path))
        .map_err(|e| AppError::Remarkable(format!("Failed to open remote file {}: {}", remote_path, e)))?;

    let mut buf = Vec::new();
    remote_file
        .read_to_end(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("Failed to read remote file: {}", e)))?;

    std::fs::write(local_path, &buf)
        .map_err(|e| AppError::Remarkable(format!("Failed to write local file: {}", e)))?;

    Ok(())
}

fn write_sftp_file(sftp: &ssh2::Sftp, remote_path: &str, data: &[u8]) -> Result<(), AppError> {
    let mut remote_file = sftp
        .create(std::path::Path::new(remote_path))
        .map_err(|e| AppError::Remarkable(format!("Failed to create remote file {}: {}", remote_path, e)))?;

    std::io::Write::write_all(&mut remote_file, data)
        .map_err(|e| AppError::Remarkable(format!("Failed to write remote file: {}", e)))?;

    Ok(())
}

fn parse_metadata_output(output: &str) -> Vec<RemarkableEntry> {
    let mut entries = Vec::new();
    let mut current_uuid = String::new();
    let mut current_json = String::new();
    let mut in_block = false;

    for line in output.lines() {
        if let Some(rest) = line.strip_prefix("<<BEGIN:") {
            if let Some(uuid) = rest.strip_suffix(">>") {
                current_uuid = uuid.to_string();
                current_json.clear();
                in_block = true;
                continue;
            }
        }

        if line == "<<END>>" {
            if in_block && !current_uuid.is_empty() {
                if let Some(entry) = parse_single_metadata(&current_uuid, &current_json) {
                    entries.push(entry);
                }
            }
            in_block = false;
            continue;
        }

        if in_block {
            if !current_json.is_empty() {
                current_json.push('\n');
            }
            current_json.push_str(line);
        }
    }

    entries
}

fn parse_single_metadata(uuid: &str, json_str: &str) -> Option<RemarkableEntry> {
    let meta: XochitlMetadata = serde_json::from_str(json_str).ok()?;

    if meta.deleted.unwrap_or(false) {
        return None;
    }

    let entry_type = match meta.entry_type.as_deref() {
        Some("CollectionType") => RemarkableEntryType::Collection,
        _ => RemarkableEntryType::Document,
    };

    let last_modified = match &meta.last_modified {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Number(n)) => n.to_string(),
        _ => String::new(),
    };

    Some(RemarkableEntry {
        id: uuid.to_string(),
        visible_name: meta.visible_name.unwrap_or_else(|| "Untitled".into()),
        entry_type,
        parent: meta.parent.unwrap_or_default(),
        last_modified,
        pinned: meta.pinned.unwrap_or(false),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_metadata_output_empty() {
        let entries = parse_metadata_output("");
        assert!(entries.is_empty());
    }

    #[test]
    fn test_parse_metadata_output_single() {
        let output = r#"<<BEGIN:abc-123>>
{"visibleName":"Test Doc","type":"DocumentType","parent":"","lastModified":"1700000000000","pinned":false,"deleted":false}
<<END>>"#;

        let entries = parse_metadata_output(output);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "abc-123");
        assert_eq!(entries[0].visible_name, "Test Doc");
    }

    #[test]
    fn test_parse_metadata_output_skips_deleted() {
        let output = r#"<<BEGIN:abc-123>>
{"visibleName":"Deleted","type":"DocumentType","parent":"","lastModified":"1700000000000","pinned":false,"deleted":true}
<<END>>"#;

        let entries = parse_metadata_output(output);
        assert!(entries.is_empty());
    }

    #[test]
    fn test_parse_metadata_output_multiple() {
        let output = r#"<<BEGIN:uuid-1>>
{"visibleName":"Doc 1","type":"DocumentType","parent":"","lastModified":"100","pinned":false,"deleted":false}
<<END>>
<<BEGIN:uuid-2>>
{"visibleName":"Folder","type":"CollectionType","parent":"","lastModified":"200","pinned":true,"deleted":false}
<<END>>"#;

        let entries = parse_metadata_output(output);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[1].visible_name, "Folder");
        assert!(entries[1].pinned);
        matches!(entries[1].entry_type, RemarkableEntryType::Collection);
    }

    #[test]
    fn test_parse_single_metadata_missing_fields() {
        let json = r#"{"visibleName":"Minimal"}"#;
        let entry = parse_single_metadata("test-uuid", json).unwrap();
        assert_eq!(entry.visible_name, "Minimal");
        assert_eq!(entry.parent, "");
    }

    #[test]
    fn test_connect_invalid_host() {
        // Use a non-routable address to trigger a timeout/error
        let result = connect("192.0.2.1", 22, "root", "test");
        assert!(result.is_err());
    }
}
