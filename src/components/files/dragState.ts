/**
 * Module-level state for the currently dragged file tree path.
 * Stored outside React so dragOver handlers can validate without
 * relying on dataTransfer.getData() (restricted in some browsers).
 */
let currentDragPath: string | null = null;

export function setDragPath(path: string | null) {
  currentDragPath = path;
}

export function getDragPath(): string | null {
  return currentDragPath;
}
