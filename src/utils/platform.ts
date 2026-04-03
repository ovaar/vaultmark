const isMac = navigator.platform.toUpperCase().includes("MAC");

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function extractFilename(path: string): string {
  const normalized = normalizePath(path);
  return normalized.split("/").pop() || path;
}

export function extractParentPath(path: string): string {
  const normalized = normalizePath(path);
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.substring(0, idx) : "";
}

export function getModifierLabel(): string {
  return isMac ? "⌘" : "Ctrl";
}

export function getModifierKey(): string {
  return isMac ? "Cmd" : "Ctrl";
}
