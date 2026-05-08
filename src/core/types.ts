import * as THREE from "three";

export type ToolMode = "navigate" | "cut";

export interface SliceVertex {
  p: THREE.Vector3;
  n: THREE.Vector3;
  uv: THREE.Vector2;
  d: number;
}

export interface SliceResult {
  front: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
}
