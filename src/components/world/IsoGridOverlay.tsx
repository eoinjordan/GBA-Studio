import React, { memo } from "react";
import {
  isoToScreen,
  isoDiamondPoints,
  isoOriginX,
  isoOriginY,
} from "shared/lib/entities/isoUtils";

interface IsoGridOverlayProps {
  /** Scene width in grid tiles. */
  mapWidth: number;
  /** Scene height in grid tiles. */
  mapHeight: number;
  /** Full rendered scene size, including any background letterboxing. */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * SVG overlay that draws the isometric diamond grid for a scene in the editor.
 * Rendered as a transparent overlay on top of the background image.
 */
const IsoGridOverlay = memo(
  ({ mapWidth, mapHeight, canvasWidth, canvasHeight }: IsoGridOverlayProps) => {
    const originX = isoOriginX(mapWidth, mapHeight, canvasWidth);
    const originY = isoOriginY(mapWidth, mapHeight, canvasHeight);

    const polygons: JSX.Element[] = [];
    for (let ty = 0; ty < mapHeight; ty++) {
      for (let tx = 0; tx < mapWidth; tx++) {
        const { x, y } = isoToScreen(tx, ty);
        const sx = originX + x;
        const sy = originY + y;
        polygons.push(
          <polygon
            key={`${tx}-${ty}`}
            points={isoDiamondPoints(sx, sy)}
            fill="none"
            stroke="rgba(100, 180, 255, 0.35)"
            strokeWidth={0.5}
          />,
        );
      }
    }

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {polygons}
      </svg>
    );
  },
);

IsoGridOverlay.displayName = "IsoGridOverlay";

export default IsoGridOverlay;
