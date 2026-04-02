import { useState, useCallback } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomeScreen } from "./components/layout/WelcomeScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useFileStore } from "./stores/fileStore";
import { useVaultStore } from "./stores/vaultStore";
import { useEditorStore } from "./stores/editorStore";
import "./styles/globals.css";

function App() {
  const setVaultRoot = useFileStore((s) => s.setVaultRoot);
  const addVault = useVaultStore((s) => s.addVault);
  const removeVault = useVaultStore((s) => s.removeVault);
  const recentVaults = useVaultStore((s) => s.recentVaults);
  const [showWelcome, setShowWelcome] = useState(true);

  const openVault = useCallback(
    (path: string) => {
      // Close all open files before switching
      const openFiles = useEditorStore.getState().openFiles;
      for (const f of openFiles) {
        useEditorStore.getState().closeFile(f.path);
      }
      useFileStore.getState().selectFile(null);
      setVaultRoot(path);
      addVault(path);
      setShowWelcome(false);
    },
    [setVaultRoot, addVault]
  );

  const handleOpenWelcome = useCallback(() => {
    setShowWelcome(true);
  }, []);

  if (showWelcome) {
    return (
      <ErrorBoundary>
        <WelcomeScreen
          recentVaults={recentVaults}
          onSelectVault={openVault}
          onRemoveVault={removeVault}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppLayout
        onSwitchVault={openVault}
        onOpenWelcome={handleOpenWelcome}
      />
    </ErrorBoundary>
  );
}

export default App;
