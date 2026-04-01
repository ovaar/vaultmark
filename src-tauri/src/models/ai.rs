use serde::{Deserialize, Serialize};

/// Request to summarize a document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummarizeRequest {
    pub content: String,
    pub max_length: Option<usize>,
}

/// Summary response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SummarizeResponse {
    pub summary: String,
}

/// Request to generate embeddings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedRequest {
    pub content: String,
    pub document_path: Option<String>,
}

/// Embedding result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedResponse {
    pub document_path: Option<String>,
    pub embedding: Vec<f32>,
}

/// Semantic search query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub top_k: Option<usize>,
}

/// Search result item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

/// Auto-tagging request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagRequest {
    pub content: String,
}

/// Auto-tagging response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagResponse {
    pub tags: Vec<String>,
}
