namespace VaultMark;

@doc("Request to summarize a document")
model SummarizeRequest {
  @doc("Document content to summarize")
  content: string;

  @doc("Maximum length of summary (optional)")
  max_length?: int32;
}

@doc("Summarization response")
model SummarizeResponse {
  @doc("Generated summary text")
  summary: string;
}

@doc("Request to generate embeddings for a document")
model EmbedRequest {
  @doc("Document content to embed")
  content: string;

  @doc("Optional document path for indexing")
  document_path?: string;
}

@doc("Embedding result")
model EmbedResponse {
  @doc("Document path if provided")
  document_path?: string;

  @doc("Embedding vector")
  embedding: float32[];
}

@doc("Semantic search query")
model SearchRequest {
  @doc("Natural language search query")
  query: string;

  @doc("Maximum number of results (default: 10)")
  top_k?: int32;
}

@doc("A single search result")
model SearchResult {
  @doc("File path of matching document")
  path: string;

  @doc("Document title")
  title: string;

  @doc("Relevant snippet from the document")
  snippet: string;

  @doc("Relevance score (0-1)")
  score: float32;
}

@doc("Request to auto-tag a document")
model TagRequest {
  @doc("Document content to analyze")
  content: string;
}

@doc("Auto-tagging response")
model TagResponse {
  @doc("Suggested tags")
  tags: string[];
}
