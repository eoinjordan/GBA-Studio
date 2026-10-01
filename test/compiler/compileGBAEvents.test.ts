import {
  compileGBAScript,
  emitGBAScriptC,
  type GBAScriptEvent,
} from "lib/compiler/compileGBAEvents";

const VM_OP_END = 0x00;
const VM_OP_SET_SCENE_TONE = 0x02;
const VM_OP_WAIT = 0x03;
const VM_OP_SET_CONST = 0x04;
const VM_OP_COPY_VAR = 0x05;
const VM_OP_ADD_CONST = 0x06;
const VM_OP_SUB_CONST = 0x07;
const VM_OP_ADD_VAR = 0x08;
const VM_OP_SUB_VAR = 0x09;
const VM_OP_RANDOM = 0x0a;
const VM_OP_JUMP = 0x0b;
const VM_OP_IF_VAR_EQ_CONST = 0x0c;
const VM_OP_IF_VAR_GT_CONST = 0x0d;
const VM_OP_IF_VAR_LT_CONST = 0x0e;
const VM_OP_SHOW_TEXT = 0x0f;
const VM_OP_IF_INPUT = 0x10;
const VM_OP_ACTOR_SET_POS = 0x11;
const VM_OP_ACTOR_MOVE_REL = 0x12;
const VM_OP_ACTOR_SET_DIR = 0x13;
const VM_OP_ACTOR_SET_HIDDEN = 0x14;
const VM_OP_ACTOR_SET_COLLISIONS = 0x15;
const VM_OP_IF_ACTOR_AT_POS = 0x16;
const VM_OP_IF_ACTOR_RELATIVE = 0x17;
const VM_OP_LOAD_SCENE_AT = 0x18;

const noopCtx = {
  sceneIndexById: {} as Record<string, number>,
  warnings: jest.fn(),
};

function makeCtx(sceneIndexById: Record<string, number> = {}) {
  return { sceneIndexById, warnings: jest.fn() };
}

describe("compileGBAScript", () => {
  it("empty script produces only VM_OP_END", () => {
    const out = compileGBAScript([], noopCtx);
    expect(out).toEqual([VM_OP_END]);
  });

  it("EVENT_END produces VM_OP_END (and the implicit terminal END)", () => {
    const events: GBAScriptEvent[] = [{ command: "EVENT_END" }];
    const out = compileGBAScript(events, noopCtx);
    // EVENT_END emits one END, then the implicit terminal appends another —
    // the engine stops at the first one so the duplicate is harmless.
    expect(out[0]).toBe(VM_OP_END);
  });

  it("EVENT_TEXT emits VM_OP_SHOW_TEXT followed by the NUL-terminated string", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_TEXT", args: { text: "Hi" } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_SHOW_TEXT);
    expect(out[1]).toBe("H".charCodeAt(0));
    expect(out[2]).toBe("i".charCodeAt(0));
    expect(out[3]).toBe(0x00); // NUL terminator
    expect(out[out.length - 1]).toBe(VM_OP_END);
  });

  it("EVENT_TEXT with array of strings joins with newline", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_TEXT", args: { text: ["Hello", "World"] } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_SHOW_TEXT);
    // "Hello\nWorld\0"
    const str = String.fromCharCode(...out.slice(1, out.indexOf(0x00, 1)));
    expect(str).toBe("Hello\nWorld");
  });

  it("EVENT_SWITCH_SCENE emits its scene destination and facing direction", () => {
    const ctx = makeCtx({ "scene-abc": 2 });
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_SWITCH_SCENE",
        args: {
          sceneId: "scene-abc",
          x: { type: "number", value: 7 },
          y: { type: "number", value: 4 },
          direction: "up",
        },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_LOAD_SCENE_AT, 2, 7, 4, 3, VM_OP_END]);
  });

  it("EVENT_SWITCH_SCENE to unknown scene emits a warning and is skipped", () => {
    const ctx = makeCtx({});
    const events: GBAScriptEvent[] = [
      { command: "EVENT_SWITCH_SCENE", args: { sceneId: "ghost-scene" } },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_END]);
    expect(ctx.warnings).toHaveBeenCalled();
  });

  it("EVENT_SET_VALUE emits VM_OP_SET_CONST with var index and value", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_SET_VALUE", args: { variable: "5", value: 42 } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_SET_CONST);
    expect(out[1]).toBe(5);
    expect(out[2]).toBe(42);
    expect(out[3]).toBe(VM_OP_END);
  });

  it("EVENT_SET_VALUE supports VAR-prefixed variable ids", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_SET_VALUE", args: { variable: "VAR_5", value: 42 } },
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "VAR_VARIABLE_6", value: 43 },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_SET_CONST);
    expect(out[1]).toBe(5);
    expect(out[2]).toBe(42);
    expect(out[3]).toBe(VM_OP_SET_CONST);
    expect(out[4]).toBe(6);
    expect(out[5]).toBe(43);
  });

  it("EVENT_SET_VALUE supports constant script values", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "1", value: { type: "number", value: 7 } },
      },
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "2", value: { type: "true" } },
      },
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "3", value: { type: "false" } },
      },
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "4", value: "12" },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_SET_CONST,
      1,
      7,
      VM_OP_SET_CONST,
      2,
      1,
      VM_OP_SET_CONST,
      3,
      0,
      VM_OP_SET_CONST,
      4,
      12,
      VM_OP_END,
    ]);
  });

  it("EVENT_SET_VALUE clamps constants to byte range", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_SET_VALUE", args: { variable: "1", value: -1 } },
      { command: "EVENT_SET_VALUE", args: { variable: "2", value: 256 } },
      { command: "EVENT_SET_VALUE", args: { variable: "3", value: 1.6 } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_SET_CONST,
      1,
      0,
      VM_OP_SET_CONST,
      2,
      255,
      VM_OP_SET_CONST,
      3,
      2,
      VM_OP_END,
    ]);
  });

  it("EVENT_SET_VALUE skips unsupported expression script values", () => {
    const ctx = makeCtx();
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_SET_VALUE",
        args: { variable: "1", value: { type: "expression", value: "$1 + 2" } },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_END]);
    expect(ctx.warnings).toHaveBeenCalledWith(
      expect.stringContaining("EVENT_SET_VALUE only supports constant"),
    );
  });

  it("EVENT_SET_VALUE copies variable script values", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_SET_VALUE",
        args: {
          variable: "VAR_1",
          value: { type: "variable", value: "VAR_2" },
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_COPY_VAR, 1, 2, VM_OP_END]);
  });

  it("EVENT_INC_VALUE and EVENT_DEC_VALUE map to add/sub one", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_INC_VALUE", args: { variable: "VAR_3" } },
      { command: "EVENT_DEC_VALUE", args: { variable: "VAR_4" } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_ADD_CONST,
      3,
      1,
      VM_OP_SUB_CONST,
      4,
      1,
      VM_OP_END,
    ]);
  });

  it("EVENT_VARIABLE_MATH supports set/copy/random/add/sub", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_VARIABLE_MATH",
        args: { vectorX: "VAR_1", operation: "set", other: "val", value: 9 },
      },
      {
        command: "EVENT_VARIABLE_MATH",
        args: {
          vectorX: "VAR_2",
          operation: "set",
          other: "var",
          vectorY: "VAR_1",
        },
      },
      {
        command: "EVENT_VARIABLE_MATH",
        args: {
          vectorX: "VAR_3",
          operation: "set",
          other: "rnd",
          minValue: 4,
          maxValue: 8,
        },
      },
      {
        command: "EVENT_VARIABLE_MATH",
        args: { vectorX: "VAR_4", operation: "add", other: "val", value: 5 },
      },
      {
        command: "EVENT_VARIABLE_MATH",
        args: {
          vectorX: "VAR_5",
          operation: "sub",
          other: "var",
          vectorY: "VAR_4",
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_SET_CONST,
      1,
      9,
      VM_OP_COPY_VAR,
      2,
      1,
      VM_OP_RANDOM,
      3,
      4,
      8,
      VM_OP_ADD_CONST,
      4,
      5,
      VM_OP_SUB_VAR,
      5,
      4,
      VM_OP_END,
    ]);
  });

  it("EVENT_VARIABLE_MATH supports variable add", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_VARIABLE_MATH",
        args: {
          vectorX: "VAR_6",
          operation: "add",
          other: "var",
          vectorY: "VAR_7",
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_ADD_VAR, 6, 7, VM_OP_END]);
  });

  it("EVENT_VARIABLE_MATH warns for unsupported VM operations", () => {
    const ctx = makeCtx();
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_VARIABLE_MATH",
        args: { vectorX: "VAR_1", operation: "mul", other: "val", value: 2 },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_END]);
    expect(ctx.warnings).toHaveBeenCalledWith(
      expect.stringContaining('EVENT_VARIABLE_MATH operation "mul"'),
    );
  });

  it("EVENT_WAIT emits VM_OP_WAIT with frame count", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_WAIT", args: { frames: 30 } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_WAIT);
    expect(out[1]).toBe(30);
  });

  it("EVENT_PALETTE_SET_BACKGROUND maps to scene tone", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_PALETTE_SET_BACKGROUND", args: { tone: 3 } },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_SET_SCENE_TONE, 3, VM_OP_END]);
  });

  it("EVENT_IF_TRUE compiles true and false branches", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF_TRUE",
        args: {
          variable: "VAR_1",
          true: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 10 },
            },
          ],
          false: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 20 },
            },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_IF_VAR_GT_CONST,
      1,
      0,
      3,
      0,
      VM_OP_JUMP,
      6,
      0,
      VM_OP_SET_CONST,
      2,
      10,
      VM_OP_JUMP,
      3,
      0,
      VM_OP_SET_CONST,
      2,
      20,
      VM_OP_END,
    ]);
  });

  it("EVENT_IF_FALSE inverts branch payloads", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF_FALSE",
        args: {
          variable: "VAR_1",
          true: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 10 },
            },
          ],
          false: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 20 },
            },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out.slice(8, 11)).toEqual([VM_OP_SET_CONST, 2, 20]);
    expect(out.slice(14, 17)).toEqual([VM_OP_SET_CONST, 2, 10]);
  });

  it("EVENT_IF supports script-value variable comparisons", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF",
        args: {
          condition: {
            type: "eq",
            valueA: { type: "variable", value: "VAR_1" },
            valueB: { type: "number", value: 5 },
          },
          true: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 1 },
            },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_IF_VAR_EQ_CONST);
    expect(out[1]).toBe(1);
    expect(out[2]).toBe(5);
    expect(out).toContain(VM_OP_SET_CONST);
  });

  it("EVENT_IF_VALUE supports inverse comparisons", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF_VALUE",
        args: {
          variable: "VAR_1",
          operator: "!=",
          comparator: 5,
          true: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 1 },
            },
          ],
          false: [
            {
              command: "EVENT_SET_VALUE",
              args: { variable: "VAR_2", value: 0 },
            },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_IF_VAR_EQ_CONST);
    expect(out.slice(8, 11)).toEqual([VM_OP_SET_CONST, 2, 0]);
    expect(out.slice(14, 17)).toEqual([VM_OP_SET_CONST, 2, 1]);
  });

  it("EVENT_IF_VALUE supports greater-than and less-than comparisons", () => {
    const gt = compileGBAScript(
      [
        {
          command: "EVENT_IF_VALUE",
          args: { variable: "VAR_1", operator: ">", comparator: 5 },
        },
      ],
      noopCtx,
    );
    const lt = compileGBAScript(
      [
        {
          command: "EVENT_IF_VALUE",
          args: { variable: "VAR_1", operator: "<", comparator: 5 },
        },
      ],
      noopCtx,
    );
    expect(gt[0]).toBe(VM_OP_IF_VAR_GT_CONST);
    expect(lt[0]).toBe(VM_OP_IF_VAR_LT_CONST);
  });

  it("EVENT_GROUP inlines its children in order", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_GROUP",
        args: {
          true: [
            { command: "EVENT_SET_VALUE", args: { variable: "1", value: 7 } },
            { command: "EVENT_INC_VALUE", args: { variable: "2" } },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([
      VM_OP_SET_CONST,
      1,
      7,
      VM_OP_ADD_CONST,
      2,
      1,
      VM_OP_END,
    ]);
  });

  it("EVENT_GROUP reads children from the children map", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_GROUP",
        children: {
          true: [{ command: "EVENT_WAIT", args: { frames: 5 } }],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_WAIT, 5, VM_OP_END]);
  });

  it("EVENT_IF_COLOR_SUPPORTED always inlines the true branch (GBA has colour)", () => {
    const ctx = makeCtx();
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF_COLOR_SUPPORTED",
        args: {
          true: [
            { command: "EVENT_SET_VALUE", args: { variable: "1", value: 1 } },
          ],
          false: [
            { command: "EVENT_SET_VALUE", args: { variable: "1", value: 0 } },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_SET_CONST, 1, 1, VM_OP_END]);
    expect(ctx.warnings).not.toHaveBeenCalled();
  });

  it("EVENT_IF_INPUT branches on a key mask (A = 0x0001)", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_IF_INPUT",
        args: {
          input: ["a"],
          true: [
            { command: "EVENT_SET_VALUE", args: { variable: "1", value: 1 } },
          ],
          false: [
            { command: "EVENT_SET_VALUE", args: { variable: "1", value: 0 } },
          ],
        },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out[0]).toBe(VM_OP_IF_INPUT);
    expect(out[1]).toBe(0x01); // mask lo (A)
    expect(out[2]).toBe(0x00); // mask hi
    expect(out).toContain(VM_OP_SET_CONST);
  });

  it("EVENT_IF_INPUT combines multiple keys into one mask", () => {
    const events: GBAScriptEvent[] = [
      { command: "EVENT_IF_INPUT", args: { input: ["b", "up"] } },
    ];
    const out = compileGBAScript(events, noopCtx);
    // B=0x02 | UP=0x40 = 0x42
    expect(out[0]).toBe(VM_OP_IF_INPUT);
    expect(out[1]).toBe(0x42);
    expect(out[2]).toBe(0x00);
  });

  it("EVENT_ACTOR_SET_POSITION resolves player to index 0", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_ACTOR_SET_POSITION",
        args: { actorId: "player", x: 5, y: 7 },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_ACTOR_SET_POS, 0, 5, 7, VM_OP_END]);
  });

  it("EVENT_ACTOR_SET_POSITION resolves a scene actor via actorIndexById", () => {
    const ctx = {
      sceneIndexById: {},
      actorIndexById: { "npc-1": 2 },
      warnings: jest.fn(),
    };
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_ACTOR_SET_POSITION",
        args: { actorId: "npc-1", x: 3, y: 4 },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_ACTOR_SET_POS, 2, 3, 4, VM_OP_END]);
  });

  it("EVENT_ACTOR_MOVE_RELATIVE encodes negative deltas as signed bytes", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_ACTOR_MOVE_RELATIVE",
        args: { actorId: "player", x: -1, y: 2 },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_ACTOR_MOVE_REL, 0, 0xff, 2, VM_OP_END]);
  });

  it("actor coordinates convert tile units to top-down runtime pixels", () => {
    const ctx = {
      sceneIndexById: {},
      coordinateScale: 8,
      warnings: jest.fn(),
    };
    const out = compileGBAScript(
      [
        {
          command: "EVENT_ACTOR_SET_POSITION",
          args: { actorId: "player", x: 5, y: 7, units: "tiles" },
        },
        {
          command: "EVENT_ACTOR_MOVE_RELATIVE",
          args: { actorId: "player", x: -1, y: 2, units: "tiles" },
        },
      ],
      ctx,
    );
    expect(out).toEqual([
      VM_OP_ACTOR_SET_POS,
      0,
      40,
      56,
      VM_OP_ACTOR_MOVE_REL,
      0,
      0xf8,
      16,
      VM_OP_END,
    ]);
  });

  it("EVENT_ACTOR_SET_DIRECTION maps direction names (up=3)", () => {
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_ACTOR_SET_DIRECTION",
        args: { actorId: "player", direction: "up" },
      },
    ];
    const out = compileGBAScript(events, noopCtx);
    expect(out).toEqual([VM_OP_ACTOR_SET_DIR, 0, 3, VM_OP_END]);
  });

  it("EVENT_ACTOR_ACTIVATE / DEACTIVATE toggle hidden", () => {
    const out = compileGBAScript(
      [
        { command: "EVENT_ACTOR_DEACTIVATE", args: { actorId: "player" } },
        { command: "EVENT_ACTOR_ACTIVATE", args: { actorId: "player" } },
      ],
      noopCtx,
    );
    expect(out).toEqual([
      VM_OP_ACTOR_SET_HIDDEN,
      0,
      1,
      VM_OP_ACTOR_SET_HIDDEN,
      0,
      0,
      VM_OP_END,
    ]);
  });

  it("EVENT_ACTOR_COLLISIONS_ENABLE / DISABLE toggle runtime collisions", () => {
    const out = compileGBAScript(
      [
        {
          command: "EVENT_ACTOR_COLLISIONS_DISABLE",
          args: { actorId: "player" },
        },
        {
          command: "EVENT_ACTOR_COLLISIONS_ENABLE",
          args: { actorId: "player" },
        },
      ],
      noopCtx,
    );
    expect(out).toEqual([
      VM_OP_ACTOR_SET_COLLISIONS,
      0,
      0,
      VM_OP_ACTOR_SET_COLLISIONS,
      0,
      1,
      VM_OP_END,
    ]);
  });

  it("EVENT_IF_ACTOR_AT_POSITION emits a runtime branch with scaled coords", () => {
    const ctx = {
      sceneIndexById: {},
      actorIndexById: { npc: 2 },
      coordinateScale: 8,
      warnings: jest.fn(),
    };
    const out = compileGBAScript(
      [
        {
          command: "EVENT_IF_ACTOR_AT_POSITION",
          args: {
            actorId: "npc",
            x: 3,
            y: 4,
            units: "tiles",
            true: [
              { command: "EVENT_SET_VALUE", args: { variable: "1", value: 7 } },
            ],
          },
        },
      ],
      ctx,
    );
    expect(out.slice(0, 6)).toEqual([VM_OP_IF_ACTOR_AT_POS, 2, 24, 32, 3, 0]);
    expect(out).toContain(VM_OP_SET_CONST);
  });

  it("EVENT_IF_ACTOR_RELATIVE_TO_ACTOR resolves both actors and direction", () => {
    const ctx = {
      sceneIndexById: {},
      actorIndexById: { npc: 1 },
      warnings: jest.fn(),
    };
    const out = compileGBAScript(
      [
        {
          command: "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR",
          args: {
            actorId: "player",
            otherActorId: "npc",
            operation: "up",
            true: [],
            false: [],
          },
        },
      ],
      ctx,
    );
    expect(out.slice(0, 6)).toEqual([VM_OP_IF_ACTOR_RELATIVE, 0, 1, 3, 3, 0]);
  });

  it("$self$ resolves to the enclosing actor index", () => {
    const ctx = {
      sceneIndexById: {},
      selfActorIndex: 3,
      warnings: jest.fn(),
    };
    const events: GBAScriptEvent[] = [
      {
        command: "EVENT_ACTOR_SET_DIRECTION",
        args: { actorId: "$self$", direction: "down" },
      },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_ACTOR_SET_DIR, 3, 0, VM_OP_END]);
  });

  it("EVENT_CALL_CUSTOM_EVENT inlines the referenced script", () => {
    const ctx = {
      sceneIndexById: {},
      customEventsById: {
        "ce-1": {
          script: [
            { command: "EVENT_SET_VALUE", args: { variable: "9", value: 1 } },
          ],
        },
      },
      warnings: jest.fn(),
    };
    const events: GBAScriptEvent[] = [
      { command: "EVENT_CALL_CUSTOM_EVENT", args: { customEventId: "ce-1" } },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_SET_CONST, 9, 1, VM_OP_END]);
  });

  it("EVENT_CALL_CUSTOM_EVENT guards against recursion", () => {
    const ctx: {
      sceneIndexById: Record<string, number>;
      customEventsById: Record<string, { script?: GBAScriptEvent[] }>;
      warnings: jest.Mock;
    } = {
      sceneIndexById: {},
      customEventsById: {},
      warnings: jest.fn(),
    };
    ctx.customEventsById["ce-loop"] = {
      script: [
        {
          command: "EVENT_CALL_CUSTOM_EVENT",
          args: { customEventId: "ce-loop" },
        },
      ],
    };
    const out = compileGBAScript(
      [
        {
          command: "EVENT_CALL_CUSTOM_EVENT",
          args: { customEventId: "ce-loop" },
        },
      ],
      ctx,
    );
    expect(out).toEqual([VM_OP_END]);
    expect(ctx.warnings).toHaveBeenCalledWith(
      expect.stringContaining("recursive"),
    );
  });

  it("unsupported events are skipped with a warning", () => {
    const ctx = makeCtx();
    const events: GBAScriptEvent[] = [
      { command: "EVENT_ACTOR_MOVE_TO", args: { actorId: "1", x: 5, y: 5 } },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out).toEqual([VM_OP_END]);
    expect(ctx.warnings).toHaveBeenCalledWith(
      expect.stringContaining("EVENT_ACTOR_MOVE_TO"),
    );
  });

  it("sequences multiple events in order", () => {
    const ctx = makeCtx({ s1: 0 });
    const events: GBAScriptEvent[] = [
      { command: "EVENT_SET_VALUE", args: { variable: "0", value: 10 } },
      { command: "EVENT_SWITCH_SCENE", args: { sceneId: "s1" } },
    ];
    const out = compileGBAScript(events, ctx);
    expect(out[0]).toBe(VM_OP_SET_CONST);
    expect(out[3]).toBe(VM_OP_LOAD_SCENE_AT);
    expect(out[8]).toBe(VM_OP_END);
  });
});

describe("emitGBAScriptC", () => {
  it("produces a valid static C byte array", () => {
    const bytecode = [VM_OP_SHOW_TEXT, 0x48, 0x69, 0x00, VM_OP_END];
    const c = emitGBAScriptC("my_script", bytecode);
    expect(c).toContain("static const uint8_t my_script[5]");
    expect(c).toContain("0x0F");
    expect(c).toContain("0x00");
  });

  it("throws before emitting invalid numeric bytes", () => {
    expect(() => emitGBAScriptC("bad_script", [Number.NaN])).toThrow(
      "Invalid GBA bytecode byte",
    );
  });
});
