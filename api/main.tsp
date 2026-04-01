import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({
  title: "VaultMark API",
})
@doc("Internal API contracts for VaultMark — a local-first knowledge manager.")
namespace VaultMark;

import "./models/file.tsp";
import "./models/backup.tsp";
import "./models/ai.tsp";
import "./routes/files.tsp";
import "./routes/backups.tsp";
import "./routes/ai.tsp";
