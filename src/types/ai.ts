export interface SummarizeResponse {
  summary: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface TagResponse {
  tags: string[];
}
