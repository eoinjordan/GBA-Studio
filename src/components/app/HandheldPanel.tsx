import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import FocusLock from "react-focus-lock";
import API from "renderer/lib/api";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { denormalizeProject } from "store/features/project/projectActions";
import consoleActions from "store/features/console/consoleActions";
import type { HandheldAction, HandheldConfig } from "shared/lib/handheld/types";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #0009;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const Panel = styled.section`
  background: #20212b;
  color: #f4f4fa;
  width: min(660px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 20px 70px #0008;
  font-size: 13px;
  h2 {
    margin: 0 0 8px;
  }
  p {
    line-height: 1.5;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
  }
  input {
    background: #12131b;
    color: inherit;
    border: 1px solid #636477;
    padding: 8px;
    border-radius: 5px;
  }
  input:focus-visible,
  button:focus-visible {
    outline: 2px solid #c4a6ff;
    outline-offset: 2px;
  }
  button {
    border: 1px solid #77758f;
    background: #343442;
    color: inherit;
    border-radius: 6px;
    padding: 9px 12px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button.primary {
    background: #7652ba;
  }
  pre {
    background: #12131b;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 180px;
    overflow: auto;
    font-size: 11px;
  }
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
`;

export default function HandheldPanel({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const project = useAppSelector((state) => state.project.present);
  const engine = useAppSelector((state) => state.engine);
  const consoleStatus = useAppSelector((state) => state.console.status);
  const [config, setConfig] = useState<HandheldConfig>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Choose your USB port, then build or load the current project.",
  );
  const [log, setLog] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    API.handheld
      .config()
      .then(setConfig)
      .catch((error) => setMessage(String(error)));
    return API.handheld.log.subscribe((_event, text) =>
      setLog((previous) => (previous + text).slice(-40000)),
    );
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, onClose]);
  const execute = async (action: HandheldAction) => {
    if (!config || busy || consoleStatus === "running") return;
    setBusy(true);
    setLog("");
    setMessage("Building the current project…");
    dispatch(consoleActions.startConsole());
    try {
      const result = await API.handheld.run(
        denormalizeProject(project),
        {
          buildType: "gba",
          exportBuild: true,
          engineSchema: {
            fields: engine.fields,
            sceneTypes: engine.sceneTypes,
            consts: engine.consts,
          },
        },
        action,
        config,
      );
      setMessage(
        action === "build"
          ? `Built ${result.firmware}`
          : "Game loaded. CRC verified; see CPU status and frame rate below.",
      );
      if (result.report)
        setLog(
          (previous) =>
            previous + "\n" + JSON.stringify(result.report, null, 2),
        );
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
      dispatch(consoleActions.completeConsole());
    }
  };
  const field = (
    key: "python" | "llvm" | "fpga" | "gowin" | "port" | "location",
    label: string,
    placeholder: string,
  ) => (
    <label>
      {label}
      <input
        value={config?.[key] || ""}
        placeholder={placeholder}
        disabled={busy}
        onChange={(event) =>
          config && setConfig({ ...config, [key]: event.target.value })
        }
      />
    </label>
  );
  const disabled = !config || busy || consoleStatus === "running";
  return (
    <Overlay>
      <FocusLock returnFocus>
        <Panel role="dialog" aria-modal="true" aria-labelledby="handheld-title">
          <h2 id="handheld-title" ref={heading} tabIndex={-1}>
            Tang Nano 20K handheld
          </h2>
          <p>
            Build this Studio project for the 480 × 272 LCD. Load game uses the
            installed FPGA platform; Flash FPGA + load installs it first.
          </p>
          <p>
            The game is held in SDRAM. Reload after power-off or FPGA
            reprogramming. This target uses native Studio firmware.
          </p>
          <Grid>
            {field(
              "port",
              "USB UART port",
              "COM5 / /dev/ttyACM0 / /dev/cu.usbmodem…",
            )}
            {field(
              "fpga",
              "GBA-FPGA folder",
              "Folder containing scripts and studio_lcd",
            )}
            {field("python", "Python executable", "python3")}
            {field("llvm", "LLVM bin folder (optional)", "Detected from PATH")}
            {field(
              "gowin",
              "Gowin installation (optional)",
              "Auto-detect programmer",
            )}
            <label>
              Programmer cable index
              <input
                type="number"
                min="0"
                value={config?.cableIndex ?? 4}
                disabled={busy}
                onChange={(event) =>
                  config &&
                  setConfig({
                    ...config,
                    cableIndex: Number(event.target.value),
                  })
                }
              />
            </label>
            {field(
              "location",
              "Gowin USB location (optional)",
              "From programmer_cli --scan-cables, e.g. 289",
            )}
          </Grid>
          <label style={{ flexDirection: "row", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={config?.sram ?? true}
              disabled={busy}
              onChange={(event) =>
                config && setConfig({ ...config, sram: event.target.checked })
              }
            />
            Temporary FPGA configuration (SRAM). Uncheck to write FPGA flash.
          </label>
          <Actions>
            <button disabled={disabled} onClick={() => execute("build")}>
              Build game
            </button>
            <button
              disabled={
                disabled || !config?.port.trim() || !config?.fpga.trim()
              }
              onClick={() => execute("load")}
            >
              Build + load game
            </button>
            <button
              className="primary"
              disabled={
                disabled || !config?.port.trim() || !config?.fpga.trim()
              }
              onClick={() => execute("flash")}
            >
              Flash FPGA + load
            </button>
            <button disabled={busy} onClick={onClose}>
              Close
            </button>
          </Actions>
          <p role="status" aria-live="polite">
            {message}
          </p>
          {log && <pre aria-label="Build and hardware report">{log}</pre>}
        </Panel>
      </FocusLock>
    </Overlay>
  );
}
