use crate::errors::AppError;
use crate::models::ai::{SearchResult, SummarizeResponse, TagResponse};
use crate::services::ai_service;

#[tauri::command]
pub fn ai_summarize(content: &str) -> Result<SummarizeResponse, AppError> {
    ai_service::summarize(content)
}

#[tauri::command]
pub fn ai_search(query: &str, vault_root: &str) -> Result<Vec<SearchResult>, AppError> {
    ai_service::search(query, vault_root)
}

#[tauri::command]
pub fn ai_suggest_tags(content: &str) -> Result<TagResponse, AppError> {
    ai_service::suggest_tags(content)
}
