import React, { memo, useCallback, useEffect, useState } from "react";
import SpriteSheetCanvas from "./SpriteSheetCanvas";
import { TILE_SIZE, TOOL_COLLISIONS } from "consts";
import {
  isoToScreen,
  isoOriginX,
  isoOriginY,
  isoCanvasDimensions,
  isoSpriteAnchorOffsetX,
} from "shared/lib/entities/isoUtils";
import {
  actorPrefabSelectors,
  actorSelectors,
  backgroundSelectors,
  sceneSelectors,
  spriteSheetSelectors,
} from "store/features/entities/entitiesState";
import editorActions from "store/features/editor/editorActions";
import styled, { css } from "styled-components";
import { Palette } from "shared/lib/entities/entitiesTypes";
import { useAppDispatch, useAppSelector } from "store/hooks";
import renderActorContextMenu from "./renderActorContextMenu";
import { ContextMenu } from "ui/menu/ContextMenu";
import { SpriteBoundingBox } from "components/sprites/MetaspriteEditor";

interface ActorViewProps {
  id: string;
  sceneId: string;
  palettes?: Palette[];
  editable?: boolean;
  isIsometric?: boolean;
}

interface WrapperProps {
  $selected?: boolean;
  $halfWidth: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  position: absolute;
  height: 8px;
  background-color: rgba(247, 45, 220, 0.5);
  outline: 1px solid rgba(140, 0, 177, 0.8);
  -webkit-transform: translate3d(0, 0, 0);

  ${(props) =>
    props.$halfWidth
      ? css`
          width: 8px;
        `
      : css`
          width: 16px;
        `}

  ${(props) =>
    props.$selected
      ? css`
          background-color: rgba(247, 45, 220, 0.8);
          outline: 1px solid rgba(140, 0, 177, 1);
          z-index: 100;
        `
      : ""}
`;

const PinScreenPreview = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 160px;
  height: 144px;
  pointer-events: none;
  z-index: 100;
  outline: 2000px solid rgba(0, 0, 0, 0.5);
`;

const CanvasWrapper = styled.div`
  pointer-events: none;
`;

const ActorView = memo(
  ({ id, sceneId, palettes, editable, isIsometric }: ActorViewProps) => {
    const dispatch = useAppDispatch();

    const actor = useAppSelector((state) =>
      actorSelectors.selectById(state, id),
    );
    const scene = useAppSelector((state) =>
      sceneSelectors.selectById(state, sceneId),
    );
    const background = useAppSelector((state) =>
      backgroundSelectors.selectById(state, scene?.backgroundId ?? ""),
    );
    const prefab = useAppSelector((state) =>
      actorPrefabSelectors.selectById(state, actor?.prefabId ?? ""),
    );

    const sprite = useAppSelector((state) =>
      spriteSheetSelectors.selectById(
        state,
        prefab?.spriteSheetId ?? actor?.spriteSheetId ?? "",
      ),
    );
    const selected = useAppSelector(
      (state) =>
        state.editor.type === "actor" &&
        state.editor.scene === sceneId &&
        state.editor.entityId === id,
    );
    const isDragging = useAppSelector(
      (state) => selected && state.editor.dragging,
    );
    const showSprite = useAppSelector((state) => state.editor.zoom > 80);
    const previewAsMono = useAppSelector(
      (state) =>
        state.project.present.settings.colorMode === "mono" ||
        (state.project.present.settings.colorMode === "mixed" &&
          state.project.present.settings.previewAsMono),
    );
    const boundsWidth = sprite?.boundsWidth || 16;
    const boundsHeight = sprite?.boundsHeight || 16;
    const boundsX = sprite?.boundsX || 0;
    const boundsY = sprite?.boundsY || 0;
    const showBoundingBox = useAppSelector(
      (state) => state.editor.tool === TOOL_COLLISIONS,
    );

    const onMouseUp = useCallback(() => {
      dispatch(editorActions.dragActorStop());
      window.removeEventListener("mouseup", onMouseUp);
    }, [dispatch]);

    const onMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (editable && e.nativeEvent.which === 1) {
          dispatch(editorActions.dragActorStart({ sceneId, actorId: id }));
          dispatch(editorActions.setTool({ tool: "select" }));
          window.addEventListener("mouseup", onMouseUp);
        }
      },
      [dispatch, editable, id, onMouseUp, sceneId],
    );

    useEffect(() => {
      if (isDragging) {
        window.addEventListener("mouseup", onMouseUp);
      }
      return () => {
        window.removeEventListener("mouseup", onMouseUp);
      };
    }, [onMouseUp, isDragging]);

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      menu: JSX.Element[];
    }>();

    const renderContextMenu = useCallback(() => {
      return renderActorContextMenu({
        dispatch,
        actorId: id,
        sceneId,
      });
    }, [dispatch, id, sceneId]);

    const onContextMenu = useCallback(
      (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        const menu = renderContextMenu();
        if (!menu) {
          return;
        }
        setContextMenu({ x: e.pageX, y: e.pageY, menu });
      },
      [renderContextMenu],
    );

    const onContextMenuClose = useCallback(() => {
      setContextMenu(undefined);
    }, []);

    if (!actor) {
      return <></>;
    }

    return (
      <>
        {selected && actor.isPinned && <PinScreenPreview />}
        <Wrapper
          $selected={selected}
          $halfWidth={sprite?.canvasWidth === 8}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          style={
            isIsometric
              ? (() => {
                  const mapWidth = scene?.width ?? 0;
                  const mapHeight = scene?.height ?? 0;
                  const canvas = isoCanvasDimensions(
                    mapWidth,
                    mapHeight,
                    (background?.width ?? 0) * TILE_SIZE,
                    (background?.height ?? 0) * TILE_SIZE,
                  );
                  const { x, y } = isoToScreen(
                    actor.x,
                    actor.y,
                    actor.isoZ ?? 0,
                  );
                  // SpriteSheetCanvas keeps the actor's foot point at either
                  // the centre of a narrow sprite or 8px into wider sprites.
                  const spriteAnchorX = isoSpriteAnchorOffsetX(
                    sprite?.canvasWidth ?? 16,
                  );
                  return {
                    left:
                      isoOriginX(mapWidth, mapHeight, canvas.width) +
                      x -
                      spriteAnchorX,
                    top: isoOriginY(mapWidth, mapHeight, canvas.height) + y,
                    zIndex: selected
                      ? 1000
                      : actor.x + actor.y + (actor.isoZ ?? 0) + 1,
                  };
                })()
              : {
                  left: actor.x * TILE_SIZE,
                  top: actor.y * TILE_SIZE,
                }
          }
        >
          {showSprite && (
            <CanvasWrapper>
              <SpriteSheetCanvas
                spriteSheetId={sprite?.id ?? ""}
                direction={actor.direction}
                frame={0}
                palettes={palettes}
                previewAsMono={previewAsMono}
                offsetPosition
              />
              {showBoundingBox && (
                <SpriteBoundingBox
                  style={{
                    left: boundsX,
                    top: TILE_SIZE - boundsY - boundsHeight,
                    width: boundsWidth,
                    height: boundsHeight,
                  }}
                />
              )}
            </CanvasWrapper>
          )}
          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={onContextMenuClose}
            >
              {contextMenu.menu}
            </ContextMenu>
          )}
        </Wrapper>
      </>
    );
  },
);

export default ActorView;
