import { invoke } from "@tauri-apps/api/core";
import type { SummarizeResponse, SearchResult, TagResponse } from "../types/ai";

export async function aiSummarize(content: string): Promise<SummarizeResponse> {
  return invoke("ai_summarize", { content });
}

export async function aiSearch(
  query: string,
  vaultRoot: string
): Promise<SearchResult[]> {
  return invoke("ai_search", { query, vaultRoot });
}

export async function aiSuggestTags(content: string): Promise<TagResponse> {
  return invoke("ai_suggest_tags", { content });
}
