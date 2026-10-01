import { campaign } from "./campaignHelpers";

describe("The Sunstone Relay campaign", () => {
  it("ships a reachable title and three supported scenes in the portable template", () => {
    campaign("isometric-adventure").validate("gba-iso", {
      scene_iso_village: [4, 5],
      scene_windridge: [2, 5],
      scene_relay_restored: [4, 5],
    });
  });
  it("gates each objective, preserves progress on return, ends and resets on replay", () => {
    const { state, start, use, bySymbol } = campaign("isometric-adventure");
    expect(state.pending).not.toBeNull();
    start();
    const village = state.sceneId;
    use("trigger_village_exit");
    expect(state.sceneId).toBe(village);
    use("actor_keeper_nia");
    use("trigger_village_exit");
    const ridge = state.sceneId;
    use("trigger_ridge_exit");
    expect(state.sceneId).toBe(ridge);
    use("trigger_west_beacon");
    use("trigger_west_beacon");
    expect(state.variables[1]).toBe(1);
    use("trigger_ridge_return");
    use("trigger_village_exit");
    expect(state.variables[1]).toBe(1);
    use("trigger_east_beacon");
    use("trigger_ridge_exit");
    expect(state.sceneId).toBe(bySymbol.scene_relay_restored.id);
    use("actor_sanctum_nia");
    expect(state.variables[5]).toBe(0);
    use("actor_sunstone_core");
    use("actor_sanctum_nia");
    expect(state.variables).toMatchObject({
      0: 1,
      1: 2,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
    });
    expect(state.pending).not.toBeNull();
    start();
    expect(state.sceneId).toBe(bySymbol.scene_title.id);
    expect(state.variables[1]).toBe(0);
    expect(state.variables[5]).toBe(0);
    expect(state.pending).not.toBeNull();
  });
});
