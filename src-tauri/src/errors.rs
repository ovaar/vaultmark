use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("File not found: {0}")]
    NotFound(String),

    #[error("Path is outside allowed scope: {0}")]
    OutOfScope(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Backup error: {0}")]
    Backup(String),

    #[error("AI service error: {0}")]
    Ai(String),

    #[error("reMarkable error: {0}")]
    Remarkable(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
