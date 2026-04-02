import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { WelcomeScreen } from "./components/layout/WelcomeScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useFileStore } from "./stores/fileStore";
import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import "./styles/globals.css";

function App() {
  const setVaultRoot = useFileStore((s) => s.setVaultRoot);
  const [defaultPath, setDefaultPath] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    homeDir()
      .then(async (home) => {
        const path = `${home}VaultMark`;
        setDefaultPath(path);
        try {
          // Check if vault directory exists by listing it
          await invoke("get_file_tree", { vaultRoot: path });
          setVaultRoot(path);
          setReady(true);
        } catch {
          // Vault doesn't exist → show welcome
          setShowWelcome(true);
        }
      })
      .catch(() => {
        setDefaultPath("/tmp/VaultMark");
        setShowWelcome(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWelcomeComplete = useCallback(
    (path: string) => {
      setVaultRoot(path);
      setShowWelcome(false);
      setReady(true);
    },
    [setVaultRoot]
  );

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
      <AppLayout />
    </ErrorBoundary>
  );
}

export default App;
