import * as THREE from "three";

export function createBaseMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    metalness: 0.1,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
}
