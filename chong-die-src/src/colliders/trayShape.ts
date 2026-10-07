import { PhysicalMaterial } from "../types/PhysicalMaterial";

/**
 * The tray's colliders as plain data, shared by the live world (`TrayColliders`) and the headless
 * pre-simulation (`helpers/preSimulate.ts`), so both throw dice into the same tray.
 */

// Use a very large wall size and thickness to avoid the possibility
// of the dice teleporting through the dice tray
const WALL_THICKNESS = 50;
const WALL_SIZE = 100;
const FLOOR_Y = -WALL_THICKNESS + 0.005; // Push the floor up a little for better contact shadows
const ROOF_Y = WALL_THICKNESS + 1.5;
const WALL_X = WALL_THICKNESS + 0.46; // Move the wall in a bit to account for the wood thickness
const WALL_Z = WALL_THICKNESS + 0.96;

export interface TrayBox {
  /** Half extents */
  args: [number, number, number];
  position: [number, number, number];
  /** Euler XYZ */
  rotation?: [number, number, number];
}

export interface TrayBody {
  friction: number;
  restitution: number;
  material: PhysicalMaterial;
  boxes: TrayBox[];
}

const SLAB: [number, number, number] = [WALL_SIZE, WALL_THICKNESS, WALL_SIZE];

export const TRAY_BODIES: TrayBody[] = [
  // Floor of the tray
  // Use a large friction and restitution to simulate a bouncy material
  {
    friction: 10,
    restitution: 0.5,
    material: "LEATHER",
    boxes: [{ args: SLAB, position: [0, FLOOR_Y, 0] }],
  },
  // Walls of the tray
  // Use a small friction to simulate a wooden material
  // Use a high restitution to reduce the change that the dice will rest up against the wall
  {
    friction: 1,
    restitution: 0.9,
    material: "WOOD",
    boxes: [
      // Bottom wall
      { args: SLAB, position: [0, FLOOR_Y, WALL_Z], rotation: [Math.PI / 2, 0, 0] },
      // Top wall
      { args: SLAB, position: [0, FLOOR_Y, -WALL_Z], rotation: [Math.PI / 2, 0, 0] },
      // Right wall
      { args: SLAB, position: [WALL_X, FLOOR_Y, 0], rotation: [0, 0, Math.PI / 2] },
      // Left wall
      { args: SLAB, position: [-WALL_X, FLOOR_Y, 0], rotation: [0, 0, Math.PI / 2] },
      // Roof
      { args: SLAB, position: [0, ROOF_Y, 0] },
    ],
  },
];
