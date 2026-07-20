import type { SpriteAnimationType } from "shared/lib/entities/entitiesTypes";

export type AnimationType =
  | "idle"
  | "moving"
  | "idleLeft"
  | "idleRight"
  | "idleUp"
  | "idleDown"
  | "movingLeft"
  | "movingRight"
  | "movingUp"
  | "movingDown"
  | "jumpingLeft"
  | "jumpingRight"
  | "climbing"
  | "hover";

const animationTypes: AnimationType[] = [
  "idleRight",
  "idleLeft",
  "idleUp",
  "idleDown",
  "movingRight",
  "movingLeft",
  "movingUp",
  "movingDown",
];

const multiAnimationTypes: AnimationType[] = [
  "idleRight",
  "idleLeft",
  "idleUp",
  "idleDown",
];

const fixedAnimationTypes: AnimationType[] = ["idle", "moving"];

const platformAnimationTypes: AnimationType[] = [
  "idleRight",
  "idleLeft",
  "jumpingRight",
  "jumpingLeft",
  "movingRight",
  "movingLeft",
  "climbing",
];

const cursorAnimationTypes: AnimationType[] = ["idle", "hover"];

// Iso diagonal directions reuse existing AnimationType slots for simplicity:
// NE → idleRight, SE → idleDown, SW → idleLeft, NW → idleUp
const isoMovementAnimationTypes: AnimationType[] = [
  "idleRight",  // NE
  "idleDown",   // SE
  "idleLeft",   // SW
  "idleUp",     // NW
];

export const getAnimationTypeByIndex = (
  type: SpriteAnimationType,
  flipLeft: boolean,
  animationIndex: number,
): AnimationType => {
  if (type === "iso_fixed") {
    return "idle";
  }
  if (type === "iso_movement") {
    return isoMovementAnimationTypes[animationIndex] ?? "idle";
  }
  if (type === "fixed" || type === "fixed_movement") {
    return fixedAnimationTypes[animationIndex];
  }
  if (type === "platform_player") {
    return filterAnimationsBySpriteType(platformAnimationTypes, type, flipLeft)[
      animationIndex
    ];
  }
  if (type === "cursor") {
    return filterAnimationsBySpriteType(cursorAnimationTypes, type, flipLeft)[
      animationIndex
    ];
  }
  if (type === "multi") {
    return filterAnimationsBySpriteType(multiAnimationTypes, type, flipLeft)[
      animationIndex
    ];
  }
  return filterAnimationsBySpriteType(animationTypes, type, flipLeft)[
    animationIndex
  ];
};

/* eslint-disable @typescript-eslint/no-unused-vars */
const ANIM_IDLE_RIGHT = 0;
const ANIM_IDLE_LEFT = 1;
const ANIM_IDLE_UP = 2;
const ANIM_IDLE_DOWN = 3;
const ANIM_MOVE_RIGHT = 4;
const ANIM_MOVE_LEFT = 5;
const ANIM_MOVE_UP = 6;
const ANIM_MOVE_DOWN = 7;
/* eslint-enable @typescript-eslint/no-unused-vars */

const fixedIndexes = [0];
const fixedMovementIndexes = [0, 4];
const multiIndexes = [0, 1, 2, 3];
const multiFlipIndexes = [0, 2, 3];
const horizontalIndexes = [0, 1];
const horizontalFlipIndexes = [0];
const horizontalMovementIndexes = [0, 1, 4, 5];
const horizontalMovementFlipIndexes = [0, 4];
const platformIndexes = [0, 1, 4, 5, 2, 3, 6];
const platformFlipIndexes = [0, 4, 2, 6];
const flipIndexes = [0, 2, 3, 4, 6, 7];
const cursorIndexes = [0, 1];

// Isometric: slot 0 = NE, 1 = SE, 2 = SW, 3 = NW
// iso_fixed    → single animation (all directions share slot 0)
// iso_movement → 4 animations, one per diagonal direction
const isoFixedIndexes = [0];
const isoMovementIndexes = [0, 1, 2, 3];

export const filterAnimationsBySpriteType = <T>(
  animationIds: T[],
  type: SpriteAnimationType,
  flipLeft: boolean,
): T[] => {
  if (type === "iso_fixed") {
    return isoFixedIndexes.map((i) => animationIds[i]);
  }
  if (type === "iso_movement") {
    return isoMovementIndexes.map((i) => animationIds[i]);
  }
  if (type === "fixed") {
    return fixedIndexes.map((i) => animationIds[i]);
  }
  if (type === "fixed_movement") {
    return fixedMovementIndexes.map((i) => animationIds[i]);
  }
  if (type === "multi" && !flipLeft) {
    return multiIndexes.map((i) => animationIds[i]);
  }
  if (type === "multi" && flipLeft) {
    return multiFlipIndexes.map((i) => animationIds[i]);
  }
  if (type === "horizontal" && !flipLeft) {
    return horizontalIndexes.map((i) => animationIds[i]);
  }
  if (type === "horizontal" && flipLeft) {
    return horizontalFlipIndexes.map((i) => animationIds[i]);
  }
  if (type === "horizontal_movement" && !flipLeft) {
    return horizontalMovementIndexes.map((i) => animationIds[i]);
  }
  if (type === "horizontal_movement" && flipLeft) {
    return horizontalMovementFlipIndexes.map((i) => animationIds[i]);
  }
  if (type === "platform_player" && !flipLeft) {
    return platformIndexes.map((i) => animationIds[i]);
  }
  if (type === "platform_player" && flipLeft) {
    return platformFlipIndexes.map((i) => animationIds[i]);
  }
  if (type === "cursor") {
    return cursorIndexes.map((i) => animationIds[i]);
  }
  if (flipLeft) {
    return flipIndexes.map((i) => animationIds[i]);
  }
  return animationIds;
};

export const animationMapBySpriteType = <T, U>(
  items: T[],
  type: SpriteAnimationType,
  flipLeft: boolean,
  fn: (item: T | undefined, flip: boolean) => U,
): U[] => {
  return Array.from(Array(8)).map((_item, index) => {
    if (type === "iso_fixed") {
      return fn(items[0], false);
    }
    if (type === "iso_movement") {
      // 4 directions; clamp index to 0-3
      return fn(items[index % 4], false);
    }
    if (type === "fixed") {
      // All animations map to 0
      return fn(items[0], false);
    }
    if (type === "fixed_movement") {
      // Idle maps to 0, Moving maps to 4
      return fn(index < 4 ? items[0] : items[4], false);
    }
    if (type === "multi" && !flipLeft) {
      // Idle and moving map to first 4
      return fn(items[index % 4], false);
    }
    if (type === "multi" && flipLeft) {
      // Left facing maps to flipped 0
      // All other idle and moving map to first 4
      if (index === 1 || index === 5) {
        return fn(items[0], true);
      }
      return fn(items[index % 4], false);
    }
    if (type === "horizontal" && !flipLeft) {
      // All frames map to first 2 (right + left idle)
      return fn(items[index % 2], false);
    }
    if (type === "horizontal" && flipLeft) {
      // Left facing maps to flipped right
      return fn(items[ANIM_IDLE_RIGHT], index % 2 !== 0);
    }
    if (type === "horizontal_movement" && !flipLeft) {
      // All frames map to first 2 (right + left idle)
      // Moving maps to 4 and 5
      const isMoving = index >= ANIM_MOVE_RIGHT;
      return fn(items[(index % 2) + (isMoving ? ANIM_MOVE_RIGHT : 0)], false);
    }
    if (type === "horizontal_movement" && flipLeft) {
      // Left facing maps to flipped right
      // Moving maps to 4 and 5
      const isMoving = index >= ANIM_MOVE_RIGHT;
      return fn(items[isMoving ? ANIM_MOVE_RIGHT : 0], index % 2 !== 0);
    }
    if (type === "platform_player" && !flipLeft) {
      // Map all in order
      return fn(items[index], false);
    }
    if (type === "platform_player" && flipLeft) {
      // Left facing maps to previous animation (right) flipped
      // others map in order
      if (index === 1 || index === 5 || index === 3) {
        return fn(items[index - 1], true);
      }
      return fn(items[index], false);
    }
    if (type === "cursor") {
      // Flip order of hover and idle state
      if (index === 0) {
        return fn(items[1], false);
      } else {
        return fn(items[0], false);
      }
    }
    if (flipLeft) {
      // Left facing maps to previous animation (right) flipped
      // others map in order
      if (index === 1 || index === 5) {
        return fn(items[index - 1], true);
      }
      return fn(items[index], false);
    }
    // Map all in order
    return fn(items[index], false);
  });
};

export const toEngineOrder = <T>(arr: T[]): T[] => {
  return [
    arr[3], // Down
    arr[0], // Right
    arr[2], // Up
    arr[1], // Left
    arr[7], // Down Moving
    arr[4], // Right Moving
    arr[6], // Up Moving
    arr[5], // Left Moving
  ];
};

/**
 * Reorders the isometric editor slots (NE, SE, SW, NW) into the runtime's
 * animation table order (down/SW, right/SE, up/NE, left/NW), followed by the
 * corresponding moving slots.
 */
export const toIsometricEngineOrder = <T>(arr: T[]): T[] => {
  return [
    arr[2], // Down / SW
    arr[1], // Right / SE
    arr[0], // Up / NE
    arr[3], // Left / NW
    arr[6], // Down / SW moving
    arr[5], // Right / SE moving
    arr[4], // Up / NE moving
    arr[7], // Left / NW moving
  ];
};
