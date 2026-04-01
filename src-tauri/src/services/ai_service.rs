use crate::errors::AppError;
use crate::models::ai::{
    EmbedRequest, EmbedResponse, SearchRequest, SearchResult, SummarizeRequest, SummarizeResponse,
    TagRequest, TagResponse,
};

/// AI provider trait — implement this for real AI backends (candle, llama.cpp, etc.)
pub trait AiProvider: Send + Sync {
    fn summarize(&self, request: &SummarizeRequest) -> Result<SummarizeResponse, AppError>;
    fn embed(&self, request: &EmbedRequest) -> Result<EmbedResponse, AppError>;
    fn search(&self, request: &SearchRequest) -> Result<Vec<SearchResult>, AppError>;
    fn suggest_tags(&self, request: &TagRequest) -> Result<TagResponse, AppError>;
}

/// Stub provider — returns placeholder responses until a real AI backend is integrated
pub struct StubAiProvider;

impl AiProvider for StubAiProvider {
    fn summarize(&self, request: &SummarizeRequest) -> Result<SummarizeResponse, AppError> {
        let word_count = request.content.split_whitespace().count();
        Ok(SummarizeResponse {
            summary: format!(
                "[AI stub] Document has {} words. Connect a local AI model to enable summarization.",
                word_count
            ),
        })
    }

    fn embed(&self, _request: &EmbedRequest) -> Result<EmbedResponse, AppError> {
        Ok(EmbedResponse {
            document_path: _request.document_path.clone(),
            embedding: vec![0.0; 384], // placeholder 384-dim vector
        })
    }

    fn search(&self, request: &SearchRequest) -> Result<Vec<SearchResult>, AppError> {
        Ok(vec![SearchResult {
            path: String::new(),
            title: "[AI stub]".into(),
            snippet: format!(
                "Semantic search for '{}' is not yet available. Connect a local AI model.",
                request.query
            ),
            score: 0.0,
        }])
    }

    fn suggest_tags(&self, _request: &TagRequest) -> Result<TagResponse, AppError> {
        Ok(TagResponse {
            tags: vec!["untagged".into()],
        })
    }
}

/// Convenience functions using the stub provider
pub fn summarize(content: &str) -> Result<SummarizeResponse, AppError> {
    let provider = StubAiProvider;
    provider.summarize(&SummarizeRequest {
        content: content.to_string(),
        max_length: None,
    })
}

pub fn search(query: &str, _vault_root: &str) -> Result<Vec<SearchResult>, AppError> {
    let provider = StubAiProvider;
    provider.search(&SearchRequest {
        query: query.to_string(),
        top_k: Some(10),
    })
}

pub fn suggest_tags(content: &str) -> Result<TagResponse, AppError> {
    let provider = StubAiProvider;
    provider.suggest_tags(&TagRequest {
        content: content.to_string(),
    })
}
