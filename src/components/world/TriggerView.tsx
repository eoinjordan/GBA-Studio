import React, { memo, useCallback, useEffect, useState } from "react";
import editorActions from "store/features/editor/editorActions";
import {
  triggerSelectors,
  sceneSelectors,
  backgroundSelectors,
} from "store/features/entities/entitiesState";
import { TILE_SIZE } from "consts";
import {
  isoToScreen,
  isoDiamondPoints,
  isoOriginX,
  isoOriginY,
  isoCanvasDimensions,
} from "shared/lib/entities/isoUtils";
import styled, { css } from "styled-components";
import { useAppDispatch, useAppSelector } from "store/hooks";
import { ContextMenu } from "ui/menu/ContextMenu";
import renderTriggerContextMenu from "./renderTriggerContextMenu";

interface TriggerViewProps {
  id: string;
  sceneId: string;
  editable?: boolean;
  isIsometric?: boolean;
}

interface WrapperProps {
  $selected?: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: rgba(255, 120, 0, 0.5);
  outline: 1px solid rgba(255, 120, 0, 1);
  -webkit-transform: translate3d(0, 0, 0);

  ${(props) =>
    props.$selected
      ? css`
          background-color: rgba(255, 199, 40, 0.9);
        `
      : ""}
`;

const TriggerView = memo(
  ({ id, sceneId, editable, isIsometric }: TriggerViewProps) => {
    const dispatch = useAppDispatch();
    const trigger = useAppSelector((state) =>
      triggerSelectors.selectById(state, id),
    );
    const selected = useAppSelector(
      (state) =>
        state.editor.type === "trigger" &&
        state.editor.scene === sceneId &&
        state.editor.entityId === id,
    );
    const isDragging = useAppSelector(
      (state) => selected && state.editor.dragging,
    );

    const onMouseUp = useCallback(() => {
      dispatch(editorActions.dragTriggerStop());
      window.removeEventListener("mouseup", onMouseUp);
    }, [dispatch]);

    const onMouseDown = useCallback(
      (e: React.MouseEvent<Element, MouseEvent>) => {
        if (editable && e.nativeEvent.which === 1) {
          dispatch(editorActions.dragTriggerStart({ sceneId, triggerId: id }));
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
      return renderTriggerContextMenu({
        dispatch,
        triggerId: id,
        sceneId,
      });
    }, [dispatch, id, sceneId]);

    const onContextMenu = useCallback(
      (e: React.MouseEvent<Element, MouseEvent>) => {
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

    const scene = useAppSelector((state) =>
      sceneSelectors.selectById(state, sceneId),
    );
    const background = useAppSelector((state) =>
      backgroundSelectors.selectById(state, scene?.backgroundId ?? ""),
    );

    if (!trigger) {
      return <></>;
    }

    // Isometric triggers: render a projected diamond SVG per tile covered by the
    // trigger bounds, overlaid on the scene canvas.
    if (isIsometric) {
      const mapWidth = scene?.width ?? 0;
      const mapHeight = scene?.height ?? 0;
      const canvas = isoCanvasDimensions(
        mapWidth,
        mapHeight,
        (background?.width ?? 0) * TILE_SIZE,
        (background?.height ?? 0) * TILE_SIZE,
      );
      const polygons: JSX.Element[] = [];
      const ox = isoOriginX(mapWidth, mapHeight, canvas.width);
      const oy = isoOriginY(mapWidth, mapHeight, canvas.height);
      for (let dy = 0; dy < Math.max(trigger.height, 1); dy++) {
        for (let dx = 0; dx < Math.max(trigger.width, 1); dx++) {
          const { x, y } = isoToScreen(trigger.x + dx, trigger.y + dy);
          polygons.push(
            <polygon
              key={`${dx}-${dy}`}
              points={isoDiamondPoints(ox + x, oy + y)}
              fill={selected ? "rgba(255,199,40,0.5)" : "rgba(255,120,0,0.35)"}
              stroke={selected ? "rgba(255,199,40,1)" : "rgba(255,120,0,0.9)"}
              strokeWidth={1}
              pointerEvents="all"
              style={{ cursor: "pointer" }}
              onMouseDown={onMouseDown}
              onContextMenu={onContextMenu}
            />,
          );
        }
      }
      return (
        <>
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {polygons}
          </svg>
          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={onContextMenuClose}
            >
              {contextMenu.menu}
            </ContextMenu>
          )}
        </>
      );
    }

    return (
      <Wrapper
        $selected={selected}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        style={{
          left: trigger.x * TILE_SIZE,
          top: trigger.y * TILE_SIZE,
          width: Math.max(trigger.width, 1) * TILE_SIZE,
          height: Math.max(trigger.height, 1) * TILE_SIZE,
        }}
      >
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
    );
  },
);

export default TriggerView;
