export type HandheldAction = "build" | "load" | "flash";
export type HandheldConfig = {
  python: string;
  llvm: string;
  fpga: string;
  gowin: string;
  port: string;
  cableIndex: number;
  location?: string;
  sram: boolean;
};
export type HandheldResult = {
  firmware: string;
  report?: Record<string, unknown>;
};
