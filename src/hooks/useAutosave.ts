import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useFileStore } from "../stores/fileStore";

export function useAutosave(delayMs: number = 1500) {
  const vaultRoot = useFileStore((s) => s.vaultRoot);
  const openFiles = useEditorStore((s) => s.openFiles);
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

  // Watch for dirty files and save them
  useEffect(() => {
    const dirtyFiles = openFiles.filter((f) => f.dirty);
    for (const file of dirtyFiles) {
      debouncedSave(file.path);
    }
  }, [openFiles, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
