import { campaign } from "./campaignHelpers";

describe("Poachermon campaign", () => {
  it("ships a reachable title and three supported scenes in the portable template", () => {
    campaign("poachermon").validate("gba-poachermon", {
      scene_scene_1: [15, 18],
      scene_snare_trail: [14, 17],
      scene_case_closed: [14, 17],
    });
  });
  it("requires evidence, arrests and rescue before closing the case, then replays", () => {
    const { state, start, use, bySymbol } = campaign("poachermon");
    start();
    const office = state.sceneId;
    use("trigger_outpost_exit");
    expect(state.sceneId).toBe(office);
    use("actor_captain_rowan");
    use("trigger_outpost_exit");
    const trail = state.sceneId;
    use("actor_poacher_ash");
    expect(state.variables[11]).toBe(0);
    use("trigger_trail_exit");
    expect(state.sceneId).toBe(trail);
    use("actor_left_snare");
    use("actor_left_snare");
    expect(state.variables[1]).toBe(1);
    use("trigger_trail_return");
    use("trigger_outpost_exit");
    expect(state.variables[1]).toBe(1);
    use("actor_right_snare");
    use("actor_poacher_ash");
    use("trigger_trail_exit");
    expect(state.sceneId).toBe(bySymbol.scene_case_closed.id);
    use("actor_trapped_creature");
    expect(state.variables[3]).toBe(0);
    use("actor_field_rowan");
    expect(state.variables[4]).toBe(0);
    use("actor_poacher_moss");
    use("actor_trapped_creature");
    use("actor_field_rowan");
    expect(state.variables).toMatchObject({
      0: 1,
      1: 2,
      2: 2,
      3: 1,
      4: 1,
      6: 0,
      8: 1,
      9: 1,
      11: 1,
      12: 1,
      13: 1,
      14: 100,
    });
    expect(state.pending).not.toBeNull();
    start();
    expect(state.sceneId).toBe(bySymbol.scene_title.id);
    expect(state.variables[1]).toBe(0);
    expect(state.variables[4]).toBe(0);
    expect(state.pending).not.toBeNull();
  });
});
