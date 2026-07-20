import React, { useCallback, useEffect, useRef } from "react";
import { useAppSelector } from "store/hooks";
import { CollisionTileDef } from "shared/lib/resources/types";
import {
  defaultCollisionTileColor,
  defaultCollisionTileIcon,
  defaultCollisionTileDefs,
} from "consts";
import {
  isCollisionTileActive,
  renderCollisionTileIcon,
} from "shared/lib/collisions/collisionTiles";
import { decHexVal } from "shared/lib/helpers/8bit";
import {
  isoDiamondPoints,
  isoOriginX,
  isoOriginY,
  isoToScreen,
} from "shared/lib/entities/isoUtils";

const TILE_SIZE = 16;

interface SceneCollisionsProps {
  width: number;
  height: number;
  collisions: number[];
  sceneTypeKey: string;
  isIsometric?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

const SceneCollisions = ({
  width,
  height,
  collisions,
  sceneTypeKey,
  isIsometric = false,
  canvasWidth = width * 8,
  canvasHeight = height * 8,
}: SceneCollisionsProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  const showCollisionTileValues = useAppSelector(
    (state) => state.project.present.settings.showCollisionTileValues,
  );

  const collisionLayerOpacity = useAppSelector(
    (state) =>
      Math.floor(state.project.present.settings.collisionLayerOpacity) / 100,
  );

  const collisionTileDefs = useAppSelector((state) => {
    const sceneType = state.engine.sceneTypes.find(
      (s) => s.key === sceneTypeKey,
    );
    if (sceneType && sceneType.collisionTiles) return sceneType.collisionTiles;
    return defaultCollisionTileDefs;
  });

  const drawCollisionTile = useCallback(
    (
      tile: CollisionTileDef,
      ctx: CanvasRenderingContext2D,
      xi: number,
      yi: number,
    ) => {
      const tileIcon = renderCollisionTileIcon(
        tile.icon ?? defaultCollisionTileIcon,
        tile.color ?? defaultCollisionTileColor,
      );
      if (isIsometric) {
        const originX = isoOriginX(width, height, canvasWidth);
        const originY = isoOriginY(width, height, canvasHeight);
        const projected = isoToScreen(xi, yi);
        const topX = originX + projected.x;
        const topY = originY + projected.y;
        const points = isoDiamondPoints(topX, topY)
          .split(" ")
          .map((point) => point.split(",").map(Number));
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = tile.color ?? defaultCollisionTileColor;
        ctx.fill();
        ctx.drawImage(tileIcon, topX - 4, topY + 4, 8, 8);
        return;
      }
      ctx.drawImage(
        tileIcon,
        0,
        0,
        8,
        8,
        xi * TILE_SIZE,
        yi * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    },
    [canvasHeight, canvasWidth, height, isIsometric, width],
  );

  const drawLetter = useCallback(
    (letter: string, ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.textBaseline = "middle";
      ctx.textAlign = isIsometric ? "center" : "start";
      const projected = isIsometric ? isoToScreen(x, y) : undefined;
      const tx = projected
        ? isoOriginX(width, height, canvasWidth) + projected.x
        : x * TILE_SIZE;
      const ty = projected
        ? isoOriginY(width, height, canvasHeight) + projected.y + 8
        : (y + 0.5) * TILE_SIZE;
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.strokeText(letter, tx, ty);
      ctx.fillStyle = "white";
      ctx.fillText(letter, tx, ty);
    },
    [canvasHeight, canvasWidth, height, isIsometric, width],
  );

  useEffect(() => {
    if (canvas.current) {
      // eslint-disable-next-line no-self-assign
      canvas.current.width = canvas.current.width; // Clear canvas
      const ctx = canvas.current.getContext("2d");

      if (!ctx) return;

      ctx.font = "8px Public Pixel";
      ctx.imageSmoothingEnabled = false;

      const activeCache: Record<string, boolean> = {};

      for (let yi = 0; yi < height; yi++) {
        for (let xi = 0; xi < width; xi++) {
          const collisionIndex = width * yi + xi;
          let tile = collisions[collisionIndex] ?? 0;
          let unknownTile = tile !== 0;

          for (const tileDef of collisionTileDefs) {
            const key = `${tile}:${tileDef.flag}:${tileDef.mask}`;
            let isActive: boolean;
            if (key in activeCache) {
              isActive = activeCache[key];
            } else {
              isActive = isCollisionTileActive(
                tile,
                tileDef,
                collisionTileDefs,
              );
              activeCache[key] = isActive;
            }

            if (isActive) {
              ctx.fillStyle = tileDef.color;
              drawCollisionTile(tileDef, ctx, xi, yi);
              if (tileDef.icon) {
                unknownTile = false;
              }
              tile = tile & ~tileDef.flag; // Clear bits for matched tile
            }
          }
          if (
            unknownTile ||
            (showCollisionTileValues && tile !== 0 && tile !== undefined)
          ) {
            drawLetter(decHexVal(tile), ctx, xi, yi);
          }
        }
      }
    }
  }, [
    canvasHeight,
    canvasWidth,
    collisionTileDefs,
    collisions,
    drawCollisionTile,
    drawLetter,
    height,
    isIsometric,
    showCollisionTileValues,
    width,
  ]);

  return (
    <canvas
      ref={canvas}
      width={isIsometric ? canvasWidth : width * TILE_SIZE}
      height={isIsometric ? canvasHeight : height * TILE_SIZE}
      style={{
        opacity: collisionLayerOpacity,
        width: isIsometric ? canvasWidth : width * TILE_SIZE * 0.5,
        height: isIsometric ? canvasHeight : undefined,
        imageRendering: "pixelated",
      }}
    />
  );
};

export default SceneCollisions;
