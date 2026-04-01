using TypeSpec.Http;
using TypeSpec.Rest;

namespace VaultMark;

@route("/ai")
@tag("AI")
interface AiOperations {
  @doc("Summarize a document")
  @route("/summarize")
  @post
  summarize(@body body: SummarizeRequest): SummarizeResponse;

  @doc("Generate embeddings for a document")
  @route("/embed")
  @post
  embed(@body body: EmbedRequest): EmbedResponse;

  @doc("Perform semantic search across the vault")
  @route("/search")
  @post
  search(@body body: SearchRequest): SearchResult[];

  @doc("Auto-tag a document")
  @route("/tags")
  @post
  suggestTags(@body body: TagRequest): TagResponse;
}
