import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import styled from "styled-components";
import handheldLogo from "../assets/app/icon/app_icon.png";
import relayScreenshot from "../assets/templatePreview/gba-iso.png";

const Shell = styled.div`
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(circle at 75% 0%, #392768 0, transparent 34rem), #0a0b12;
  color: #f7f4ff;
  font:
    13px Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
`;

const Window = styled.div`
  min-height: 720px;
  overflow: hidden;
  border: 1px solid #34384c;
  border-radius: 14px;
  background: #11131d;
  box-shadow: 0 28px 90px #0009;
`;

const Topbar = styled.header`
  min-height: 52px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #303448;
  background: #171a27;
`;

const Mark = styled.img`
  width: 48px;
  height: 32px;
  object-fit: contain;
`;

const ProjectTitle = styled.div`
  min-width: 172px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 2px;
    color: #9da4bd;
    font-size: 11px;
  }
`;

const Spacer = styled.span`
  flex: 1;
`;

const ToolButton = styled.button<{ $active?: boolean; $primary?: boolean }>`
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${({ $active, $primary }) =>
      $primary ? "#8b5cf6" : $active ? "#7864a6" : "#383d54"};
  border-radius: 7px;
  background: ${({ $active, $primary }) =>
    $primary ? "#7c3aed" : $active ? "#302747" : "#202331"};
  color: #f7f4ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: #b9a2ff;
  }
`;

const Body = styled.div`
  min-height: 668px;
  display: grid;
  grid-template-columns: 220px minmax(420px, 1fr) 270px;
`;

const Sidebar = styled.aside`
  padding: 14px 12px;
  border-right: 1px solid #303448;
  background: #141722;
`;

const Inspector = styled(Sidebar)`
  border-right: 0;
  border-left: 1px solid #303448;
`;

const PanelTitle = styled.div`
  margin: 5px 5px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #aeb5ca;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Entity = styled.button<{ $selected?: boolean }>`
  width: 100%;
  margin-bottom: 4px;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid
    ${({ $selected }) => ($selected ? "#6d5a98" : "transparent")};
  border-radius: 7px;
  background: ${({ $selected }) => ($selected ? "#2a243d" : "transparent")};
  color: ${({ $selected }) => ($selected ? "#fff" : "#bec4d5")};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &::before {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ $selected }) => ($selected ? "#a78bfa" : "#596078")};
    content: "";
  }
`;

const Canvas = styled.main`
  position: relative;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(#161926 1px, transparent 1px),
    linear-gradient(90deg, #161926 1px, transparent 1px), #0d0f17;
  background-size: 24px 24px;
`;

const CanvasToolbar = styled.div`
  position: relative;
  z-index: 4;
  height: 48px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-bottom: 1px solid #292d3e;
  background: #121520e8;
`;

const Scene = styled.div`
  position: absolute;
  inset: 48px 0 0;
  display: grid;
  place-items: center;
`;

const SceneImage = styled.img`
  width: min(90%, 720px);
  aspect-ratio: 3 / 2;
  object-fit: contain;
  image-rendering: pixelated;
`;

const PlayOverlay = styled.div`
  position: absolute;
  z-index: 6;
  inset: 48px 0 0;
  display: grid;
  place-items: center;
  background: #05060ad9;
`;

const PreviewFrame = styled.iframe`
  width: min(95%, 720px);
  height: min(80%, 540px);
  border: 1px solid #8068b8;
  border-radius: 10px;
  background: #05060a;
`;

const Field = styled.label`
  margin: 0 4px 14px;
  display: block;
  color: #9ca3ba;
  font-size: 11px;

  input,
  select {
    width: 100%;
    height: 34px;
    margin-top: 6px;
    padding: 0 9px;
    border: 1px solid #373c51;
    border-radius: 6px;
    background: #0f111a;
    color: #f4f1ff;
    font: inherit;
  }
`;

const Event = styled.div<{ $green?: boolean }>`
  margin: 0 4px 8px;
  padding: 10px;
  border: 1px solid ${({ $green }) => ($green ? "#34614b" : "#4e4567")};
  border-left: 4px solid ${({ $green }) => ($green ? "#65b184" : "#9f85eb")};
  border-radius: 6px;
  background: #1a1d29;
  color: #d6daea;

  small {
    display: block;
    margin-top: 4px;
    color: #8f96ac;
  }
`;

const StudioWorkspace = () => {
  const [mode, setMode] = useState<"world" | "script">("world");
  const [running, setRunning] = useState(false);

  return (
    <Shell>
      <Window>
        <Topbar>
          <Mark src={handheldLogo} alt="GBA Studio handheld" />
          <ProjectTitle>
            <strong>The Sunstone Relay</strong>
            <span>GBA Studio · Browser workspace preview</span>
          </ProjectTitle>
          <ToolButton
            $active={mode === "world"}
            onClick={() => setMode("world")}
          >
            World
          </ToolButton>
          <ToolButton
            $active={mode === "script"}
            onClick={() => setMode("script")}
          >
            Script
          </ToolButton>
          <Spacer />
          <ToolButton disabled title="Build and flash in the desktop app">
            Build in desktop app
          </ToolButton>
          <ToolButton $primary onClick={() => setRunning(true)}>
            ▶ Run
          </ToolButton>
        </Topbar>

        <Body>
          <Sidebar>
            <PanelTitle>
              Project <span>+</span>
            </PanelTitle>
            <Entity $selected>◇ Sunstone Village</Entity>
            <Entity>◇ Relay Restored</Entity>
            <PanelTitle>Actors</PanelTitle>
            <Entity>Keeper Nia</Entity>
            <Entity>Sunstone Core</Entity>
            <PanelTitle>Triggers</PanelTitle>
            <Entity>West Beacon</Entity>
            <Entity>East Beacon</Entity>
          </Sidebar>

          <Canvas>
            <CanvasToolbar>
              <ToolButton $active={mode === "world"}>Select</ToolButton>
              <ToolButton>Collision</ToolButton>
              <ToolButton>Actors</ToolButton>
              <Spacer />
              <span>Isometric · 100%</span>
            </CanvasToolbar>
            <Scene>
              <SceneImage
                src={relayScreenshot}
                alt="The current Sunstone Relay game"
              />
            </Scene>
            {running && (
              <PlayOverlay>
                <PreviewFrame
                  title="Play The Sunstone Relay"
                  src="../player/emulator.html?rom=roms%2Fisometric-adventure.gba&name=The%20Sunstone%20Relay"
                  allow="autoplay; fullscreen; gamepad"
                />
                <ToolButton $primary onClick={() => setRunning(false)}>
                  Stop preview
                </ToolButton>
              </PlayOverlay>
            )}
          </Canvas>

          <Inspector>
            <PanelTitle>{mode === "world" ? "Scene" : "Script"}</PanelTitle>
            {mode === "world" ? (
              <>
                <Field>
                  Name
                  <input value="Sunstone Village" readOnly />
                </Field>
                <Field>
                  Scene type
                  <select value="isometric" disabled>
                    <option value="isometric">Isometric</option>
                  </select>
                </Field>
                <Field>
                  Background
                  <input value="Iso Village" readOnly />
                </Field>
                <Event $green>
                  Current sample assets
                  <small>
                    177 unique background tiles · authored RGB colors
                  </small>
                </Event>
              </>
            ) : (
              <>
                <Event>
                  On Init
                  <small>Show “The relay is fading...”</small>
                </Event>
                <Event $green>
                  If beacons = 2<small>Enable Sunstone Core</small>
                </Event>
                <Event>
                  Switch Scene
                  <small>Relay Restored</small>
                </Event>
              </>
            )}
          </Inspector>
        </Body>
      </Window>
    </Shell>
  );
};

const meta: Meta<typeof StudioWorkspace> = {
  title: "GBA Studio Preview",
  component: StudioWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof StudioWorkspace>;

export const StudioWorkspacePreview: Story = {};
