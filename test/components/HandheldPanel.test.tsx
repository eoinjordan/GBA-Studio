/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HandheldPanel from "../../src/components/app/HandheldPanel";
import API from "renderer/lib/api";
import { useAppSelector, useAppDispatch } from "store/hooks";
import { denormalizeProject } from "store/features/project/projectActions";

jest.mock("store/hooks");
jest.mock("store/features/project/projectActions", () => ({
  denormalizeProject: jest.fn(),
}));
const config = {
  python: "python",
  llvm: "",
  fpga: "FPGA folder",
  gowin: "",
  port: "",
  cableIndex: 4,
  location: "289",
  sram: true,
};
const state = {
  project: { present: { metadata: { name: "Current unsaved game" } } },
  engine: { fields: [], sceneTypes: [], consts: [] },
  console: { status: "idle" },
};
beforeEach(() => {
  jest.resetAllMocks();
  (useAppSelector as jest.Mock).mockImplementation((selector) =>
    selector(state),
  );
  (useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
  (denormalizeProject as jest.Mock).mockReturnValue(state.project.present);
  API.handheld = {
    config: jest.fn().mockResolvedValue(config),
    run: jest.fn(),
    log: { subscribe: jest.fn().mockReturnValue(jest.fn()), once: jest.fn() },
  };
});
test("load requires a port and uses the current project; command errors remain visible", async () => {
  (API.handheld.run as jest.Mock).mockRejectedValue(
    new Error("No cable found"),
  );
  render(<HandheldPanel onClose={jest.fn()} />);
  await waitFor(() =>
    expect(screen.getByLabelText("Python executable")).toHaveValue("python"),
  );
  expect(
    screen.getByRole("button", { name: "Flash FPGA + load" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("USB UART port"), {
    target: { value: "COM5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Flash FPGA + load" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("No cable found"),
  );
  expect(API.handheld.run).toHaveBeenCalledWith(
    state.project.present,
    expect.anything(),
    "flash",
    expect.objectContaining({ port: "COM5", location: "289", sram: true }),
  );
  expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
});
test("successful build shows the native firmware path", async () => {
  (API.handheld.run as jest.Mock).mockResolvedValue({
    firmware: "build/tang/firmware/game.tang.bin",
  });
  render(<HandheldPanel onClose={jest.fn()} />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Build game" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Build game" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("game.tang.bin"),
  );
});
