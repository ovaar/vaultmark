import { useState } from "react";
import { useRemarkableStore } from "../../stores/remarkableStore";

type GuideStep = "welcome" | "connection-type" | "find-info" | "enter-details" | "testing" | "done";

interface ConnectionGuideProps {
  onClose: () => void;
}

export function ConnectionGuide({ onClose }: ConnectionGuideProps) {
  const [step, setStep] = useState<GuideStep>("welcome");
  const [connectionType, setConnectionType] = useState<"usb" | "wifi">("usb");

  const {
    connection,
    password,
    hostname,
    error,
    setConnection,
    setPassword,
    testConnection,
    loadFiles,
  } = useRemarkableStore();

  const handleTest = async () => {
    setStep("testing");
    const success = await testConnection();
    if (success) {
      await loadFiles();
      setStep("done");
    } else {
      setStep("enter-details");
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <>
      <div className="guide-overlay" onClick={onClose} />
      <div className="guide-modal" role="dialog" aria-label="reMarkable Connection Guide">
        <button className="guide-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="guide-progress">
          <div className="guide-progress-bar">
            <div
              className="guide-progress-fill"
              style={{ width: `${getProgressPercent(step)}%` }}
            />
          </div>
          <span className="guide-step-label">{getStepLabel(step)}</span>
        </div>

        <div className="guide-body">
          {step === "welcome" && (
            <div className="guide-step">
              <h2 className="guide-title">Connect your reMarkable</h2>
              <p className="guide-text">
                This guide will walk you through connecting your reMarkable
                tablet to VaultMark. You'll be able to browse files on your
                device and sync documents.
              </p>
              <div className="guide-info-box">
                <strong>What you'll need:</strong>
                <ul>
                  <li>Your reMarkable tablet powered on</li>
                  <li>A USB cable or WiFi connection</li>
                  <li>Your device SSH password</li>
                </ul>
              </div>
              <div className="guide-actions">
                <button className="guide-btn guide-btn-primary" onClick={() => setStep("connection-type")}>
                  Get Started
                </button>
                <button className="guide-btn guide-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "connection-type" && (
            <div className="guide-step">
              <h2 className="guide-title">How is your reMarkable connected?</h2>
              <p className="guide-text">Choose how your device is connected to your computer.</p>

              <div className="guide-options">
                <button
                  className={`guide-option ${connectionType === "usb" ? "selected" : ""}`}
                  onClick={() => {
                    setConnectionType("usb");
                    setConnection({ host: "10.11.99.1" });
                  }}
                >
                  <span className="guide-option-icon">🔌</span>
                  <span className="guide-option-label">USB Cable</span>
                  <span className="guide-option-desc">
                    Connected directly via USB. Uses default address 10.11.99.1
                  </span>
                </button>
                <button
                  className={`guide-option ${connectionType === "wifi" ? "selected" : ""}`}
                  onClick={() => {
                    setConnectionType("wifi");
                    setConnection({ host: "" });
                  }}
                >
                  <span className="guide-option-icon">📶</span>
                  <span className="guide-option-label">WiFi</span>
                  <span className="guide-option-desc">
                    On the same network. You'll need the device's WiFi IP address.
                  </span>
                </button>
              </div>

              <div className="guide-actions">
                <button className="guide-btn guide-btn-primary" onClick={() => setStep("find-info")}>
                  Continue
                </button>
                <button className="guide-btn guide-btn-secondary" onClick={() => setStep("welcome")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "find-info" && (
            <div className="guide-step">
              <h2 className="guide-title">Find your device password</h2>
              <p className="guide-text">
                Your SSH password is shown on the device itself. Follow these steps:
              </p>
              <ol className="guide-steps-list">
                <li>On your reMarkable, open the <strong>Menu</strong></li>
                <li>Go to <strong>Settings</strong></li>
                <li>
                  Select <strong>Help</strong> → <strong>About</strong> (or just <strong>Help</strong> on older firmware)
                </li>
                <li>Tap <strong>Copyright and licenses</strong></li>
                <li>
                  Find your password under <strong>"GPLv3 Compliance"</strong>
                  {connectionType === "wifi" && (
                    <> — also note the <strong>WiFi IP address</strong></>
                  )}
                </li>
              </ol>
              <div className="guide-info-box guide-info-note">
                <strong>Note:</strong> The username is always <code>root</code>.
                The port is <code>22</code> (SSH default).
              </div>

              <div className="guide-actions">
                <button className="guide-btn guide-btn-primary" onClick={() => setStep("enter-details")}>
                  I have the password
                </button>
                <button className="guide-btn guide-btn-secondary" onClick={() => setStep("connection-type")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "enter-details" && (
            <div className="guide-step">
              <h2 className="guide-title">Enter connection details</h2>
              <p className="guide-text">
                Fill in the details below, then test the connection.
              </p>

              <div className="guide-form">
                <div className="guide-field">
                  <label htmlFor="guide-host">
                    {connectionType === "usb" ? "Host (USB)" : "WiFi IP Address"}
                  </label>
                  <input
                    id="guide-host"
                    type="text"
                    value={connection.host}
                    onChange={(e) => setConnection({ host: e.target.value })}
                    placeholder={connectionType === "usb" ? "10.11.99.1" : "192.168.1.x"}
                  />
                </div>
                <div className="guide-field-row">
                  <div className="guide-field">
                    <label htmlFor="guide-username">Username</label>
                    <input
                      id="guide-username"
                      type="text"
                      value={connection.username}
                      onChange={(e) => setConnection({ username: e.target.value })}
                    />
                  </div>
                  <div className="guide-field">
                    <label htmlFor="guide-port">Port</label>
                    <input
                      id="guide-port"
                      type="number"
                      value={connection.port}
                      onChange={(e) => setConnection({ port: parseInt(e.target.value, 10) || 22 })}
                    />
                  </div>
                </div>
                <div className="guide-field">
                  <label htmlFor="guide-password">Password</label>
                  <input
                    id="guide-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="From Copyright and licenses screen"
                  />
                </div>
              </div>

              {error && <p className="guide-error">{error}</p>}

              <div className="guide-actions">
                <button
                  className="guide-btn guide-btn-primary"
                  onClick={handleTest}
                  disabled={!connection.host || !password}
                >
                  Test Connection
                </button>
                <button className="guide-btn guide-btn-secondary" onClick={() => setStep("find-info")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "testing" && (
            <div className="guide-step guide-step-center">
              <div className="guide-spinner" />
              <h2 className="guide-title">Connecting...</h2>
              <p className="guide-text">
                Attempting SSH connection to {connection.host}:{connection.port}
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="guide-step guide-step-center">
              <span className="guide-success-icon">✓</span>
              <h2 className="guide-title">Connected!</h2>
              <p className="guide-text">
                Successfully connected to <strong>{hostname || "reMarkable"}</strong>.
                You can now browse and sync files from the sidebar panel.
              </p>
              <div className="guide-actions">
                <button className="guide-btn guide-btn-primary" onClick={handleFinish}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getProgressPercent(step: GuideStep): number {
  const steps: Record<GuideStep, number> = {
    welcome: 0,
    "connection-type": 20,
    "find-info": 40,
    "enter-details": 60,
    testing: 80,
    done: 100,
  };
  return steps[step];
}

function getStepLabel(step: GuideStep): string {
  const labels: Record<GuideStep, string> = {
    welcome: "Welcome",
    "connection-type": "Connection Type",
    "find-info": "Find Password",
    "enter-details": "Enter Details",
    testing: "Testing",
    done: "Complete",
  };
  return labels[step];
}
