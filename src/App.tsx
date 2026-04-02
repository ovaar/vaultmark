import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomeScreen } from "./components/layout/WelcomeScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useFileStore } from "./stores/fileStore";
import { useVaultStore } from "./stores/vaultStore";
import { useEditorStore } from "./stores/editorStore";
import { homeDir } from "@tauri-apps/api/path";
import "./styles/globals.css";

function App() {
  const setVaultRoot = useFileStore((s) => s.setVaultRoot);
  const addVault = useVaultStore((s) => s.addVault);
  const recentVaults = useVaultStore((s) => s.recentVaults);
  const [defaultPath, setDefaultPath] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => recentVaults.length === 0);
  const [ready, setReady] = useState(() => recentVaults.length > 0);

  // Set vault root for the most recent vault on mount
  useEffect(() => {
    const vaults = useVaultStore.getState().recentVaults;
    if (vaults.length > 0) {
      const lastVault = vaults[0].path;
      setVaultRoot(lastVault);
      addVault(lastVault);
    }
  }, [setVaultRoot, addVault]);

  // Resolve default path for welcome screen
  useEffect(() => {
    if (showWelcome && !defaultPath) {
      homeDir()
        .then((home) => setDefaultPath(`${home}/VaultMark`))
        .catch(() => setDefaultPath("/tmp/VaultMark"));
    }
  }, [showWelcome, defaultPath]);

  const handleWelcomeComplete = useCallback(
    (path: string) => {
      setVaultRoot(path);
      addVault(path);
      setShowWelcome(false);
      setReady(true);
    },
    [setVaultRoot, addVault]
  );

  const handleSwitchVault = useCallback(
    (path: string) => {
      // Close all open files before switching
      const openFiles = useEditorStore.getState().openFiles;
      for (const f of openFiles) {
        useEditorStore.getState().closeFile(f.path);
      }
      useFileStore.getState().selectFile(null);
      setVaultRoot(path);
      addVault(path);
    },
    [setVaultRoot, addVault]
  );

  const handleOpenWelcome = useCallback(() => {
    setReady(false);
    setShowWelcome(true);
  }, []);

  if (showWelcome) {
    return (
      <ErrorBoundary>
        <WelcomeScreen
          defaultPath={defaultPath}
          onComplete={handleWelcomeComplete}
        />
      </ErrorBoundary>
    );
  }

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <AppLayout
        onSwitchVault={handleSwitchVault}
        onOpenWelcome={handleOpenWelcome}
      />
    </ErrorBoundary>
  );
}

export default App;
