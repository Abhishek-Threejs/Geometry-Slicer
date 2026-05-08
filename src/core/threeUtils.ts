import * as THREE from "three";
import { EPS } from "./constants";

export function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
  } else {
    material.dispose();
  }
}

export function setupPieceMesh(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isPiece = true;
}

export function updateMouse(
  event: PointerEvent,
  mouse: THREE.Vector2,
  width: number,
  height: number,
) {
  mouse.x = (event.clientX / width) * 2 - 1;
  mouse.y = -(event.clientY / height) * 2 + 1;
}

export function getPointerHits(args: {
  event: PointerEvent;
  targets: THREE.Object3D[];
  mouse: THREE.Vector2;
  raycaster: THREE.Raycaster;
  camera: THREE.Camera;
  width: number;
  height: number;
}) {
  updateMouse(args.event, args.mouse, args.width, args.height);
  args.raycaster.setFromCamera(args.mouse, args.camera);
  return args.raycaster.intersectObjects(args.targets, false);
}

export function getWorldPointOnPlane(args: {
  event: PointerEvent;
  plane: THREE.Plane;
  target: THREE.Vector3;
  mouse: THREE.Vector2;
  raycaster: THREE.Raycaster;
  camera: THREE.Camera;
  width: number;
  height: number;
}) {
  updateMouse(args.event, args.mouse, args.width, args.height);
  args.raycaster.setFromCamera(args.mouse, args.camera);
  const hit = args.raycaster.ray.intersectPlane(args.plane, args.target);
  return hit ? args.target : null;
}

export function computeMeshCenter(mesh: THREE.Mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  return box.getCenter(new THREE.Vector3());
}

export function computeCutPlane(args: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  mesh: THREE.Mesh;
  camera: THREE.Camera;
}) {
  const dragDir = args.end.clone().sub(args.start);
  if (dragDir.lengthSq() < EPS) {
    dragDir.set(1, 0, 0);
  }
  dragDir.normalize();

  const cameraDir = new THREE.Vector3();
  args.camera.getWorldDirection(cameraDir);

  let normal = new THREE.Vector3().crossVectors(dragDir, cameraDir);
  if (normal.lengthSq() < EPS) {
    normal = new THREE.Vector3().crossVectors(
      dragDir,
      new THREE.Vector3(0, 1, 0),
    );
  }
  if (normal.lengthSq() < EPS) {
    normal.set(0, 1, 0);
  }
  normal.normalize();

  const center = computeMeshCenter(args.mesh);
  const midpoint = args.start.clone().add(args.end).multiplyScalar(0.5);
  const coplanarPoint = center.clone().lerp(midpoint, 0.35);

  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    normal,
    coplanarPoint,
  );
  return { plane, normal, coplanarPoint };
}
