import {
  toEngineOrder,
  toIsometricEngineOrder,
} from "shared/lib/sprites/helpers";

describe("sprite animation runtime ordering", () => {
  test("keeps the standard down/right/up/left mapping", () => {
    expect(toEngineOrder(["right", "left", "up", "down", 4, 5, 6, 7])).toEqual([
      "down",
      "right",
      "up",
      "left",
      7,
      4,
      6,
      5,
    ]);
  });

  test("maps isometric NE/SE/SW/NW slots to runtime directions", () => {
    expect(
      toIsometricEngineOrder([
        "NE",
        "SE",
        "SW",
        "NW",
        "NE moving",
        "SE moving",
        "SW moving",
        "NW moving",
      ]),
    ).toEqual([
      "SW",
      "SE",
      "NE",
      "NW",
      "SW moving",
      "SE moving",
      "NE moving",
      "NW moving",
    ]);
  });
});
