/**
 * @jest-environment jsdom
 */

import React from "react";
import IsoGridOverlay from "components/world/IsoGridOverlay";
import { render } from "../../react-utils";

describe("IsoGridOverlay", () => {
  test("centres a rectangular grid inside the complete scene canvas", () => {
    const { container } = render(
      <IsoGridOverlay
        mapWidth={2}
        mapHeight={1}
        canvasWidth={80}
        canvasHeight={40}
      />,
    );

    const svg = container.querySelector("svg");
    const polygons = container.querySelectorAll("polygon");

    expect(svg).toHaveStyle({ width: "80px", height: "40px" });
    expect(polygons).toHaveLength(2);
    expect(polygons[0]).toHaveAttribute(
      "points",
      "32,8 48,16 32,24 16,16",
    );
    expect(polygons[1]).toHaveAttribute(
      "points",
      "48,16 64,24 48,32 32,24",
    );
  });
});
