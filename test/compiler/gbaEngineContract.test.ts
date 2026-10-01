import { readFileSync } from "fs";
import { join, resolve } from "path";
import {
  compileGBAScript,
  type GBAScriptEvent,
} from "lib/compiler/compileGBAEvents";

const vmHeaderPath = process.env.GBA_ENGINE_VM_HEADER
  ? resolve(process.env.GBA_ENGINE_VM_HEADER)
  : join(process.cwd(), "appData", "engine", "gbavm", "include", "vm.h");
const vmHeader = readFileSync(vmHeaderPath, "utf8");

const vmOpcode = (name: string): number => {
  const match = vmHeader.match(
    new RegExp(`#define\\s+${name}\\s+0x([0-9A-Fa-f]+)`),
  );
  if (!match) {
    throw new Error(`Missing ${name} in bundled GBA engine vm.h`);
  }
  return parseInt(match[1], 16);
};

test("GBA event compiler opcodes match bundled engine VM constants", () => {
  const events: GBAScriptEvent[] = [
    { command: "EVENT_SWITCH_SCENE", args: { sceneId: "scene2" } },
    { command: "EVENT_WAIT", args: { frames: 9 } },
    { command: "EVENT_SET_VALUE", args: { variable: "VAR_4", value: 7 } },
    {
      command: "EVENT_SET_VALUE",
      args: { variable: "VAR_5", value: { type: "variable", value: "VAR_4" } },
    },
    { command: "EVENT_INC_VALUE", args: { variable: "VAR_4" } },
    { command: "EVENT_DEC_VALUE", args: { variable: "VAR_4" } },
    {
      command: "EVENT_VARIABLE_MATH",
      args: {
        vectorX: "VAR_1",
        operation: "add",
        other: "var",
        vectorY: "VAR_2",
      },
    },
    {
      command: "EVENT_VARIABLE_MATH",
      args: {
        vectorX: "VAR_1",
        operation: "sub",
        other: "var",
        vectorY: "VAR_2",
      },
    },
    {
      command: "EVENT_VARIABLE_MATH",
      args: {
        vectorX: "VAR_1",
        operation: "set",
        other: "rnd",
        minValue: 1,
        maxValue: 3,
      },
    },
    { command: "EVENT_PALETTE_SET_BACKGROUND", args: { tone: 2 } },
    {
      command: "EVENT_IF_VALUE",
      args: {
        variable: "VAR_1",
        operator: "==",
        comparator: 1,
        true: [
          { command: "EVENT_SET_VALUE", args: { variable: "VAR_2", value: 1 } },
        ],
        false: [
          { command: "EVENT_SET_VALUE", args: { variable: "VAR_2", value: 0 } },
        ],
      },
    },
    { command: "EVENT_TEXT", args: { text: "OK" } },
    {
      command: "EVENT_ACTOR_COLLISIONS_DISABLE",
      args: { actorId: "player" },
    },
    {
      command: "EVENT_IF_ACTOR_AT_POSITION",
      args: { actorId: "player", x: 0, y: 0, true: [], false: [] },
    },
    {
      command: "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR",
      args: {
        actorId: "player",
        otherActorId: "npc",
        operation: "left",
        true: [],
        false: [],
      },
    },
  ];

  const bytecode = compileGBAScript(events, {
    sceneIndexById: { scene2: 3 },
    warnings: jest.fn(),
  });

  const emittedOpcodes = new Set(bytecode);
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_LOAD_SCENE_AT"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_WAIT"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_SET_CONST"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_COPY_VAR"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_ADD_CONST"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_SUB_CONST"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_ADD_VAR"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_SUB_VAR"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_RANDOM"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_JUMP"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_IF_VAR_EQ_CONST"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_SET_SCENE_TONE"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_SHOW_TEXT"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_ACTOR_SET_COLLISIONS"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_IF_ACTOR_AT_POS"));
  expect(emittedOpcodes).toContain(vmOpcode("VM_OP_IF_ACTOR_RELATIVE"));
  expect(bytecode[bytecode.length - 1]).toBe(vmOpcode("VM_OP_END"));
});
