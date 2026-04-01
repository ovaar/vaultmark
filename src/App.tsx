import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { useFileStore } from "./stores/fileStore";
import { homeDir } from "@tauri-apps/api/path";
import "./styles/globals.css";

function App() {
  const setVaultRoot = useFileStore((s) => s.setVaultRoot);
  const vaultRoot = useFileStore((s) => s.vaultRoot);

  useEffect(() => {
    if (!vaultRoot) {
      homeDir().then((home) => {
        setVaultRoot(`${home}VaultMark`);
      }).catch(() => {
        // Fallback if path API unavailable (e.g., dev outside Tauri)
        setVaultRoot(`/tmp/VaultMark`);
      });
    }
  }, [vaultRoot, setVaultRoot]);

  return <AppLayout />;
}

export default App;
