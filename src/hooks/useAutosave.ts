import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useFileStore } from "../stores/fileStore";

export function useAutosave(delayMs: number = 1500) {
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const groups = useEditorStore((s) => s.groups);
  const saveFile = useEditorStore((s) => s.saveFile);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (path: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(async () => {
        await saveFile(vaultRoot, path);
      }, delayMs);
    },
    [vaultRoot, saveFile, delayMs]
  );

  // Watch for dirty files across all groups and save them
  useEffect(() => {
    for (const group of groups) {
      const dirtyFiles = group.openFiles.filter((f) => f.dirty);
      for (const file of dirtyFiles) {
        debouncedSave(file.path);
      }
    }
  }, [groups, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
