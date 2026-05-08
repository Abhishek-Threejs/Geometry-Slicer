import * as THREE from "three";
import type { ToolMode } from "./core/types";
import {
  getPointerHits,
  getWorldPointOnPlane,
  updateMouse,
} from "./core/threeUtils";
import { ShapeManager } from "./managers/ShapeManager";
import { CutManager } from "./managers/CutManager";
import { DragManager } from "./managers/DragManager";
import { createThreeScene } from "./scene/createThreeScene";
import { createBaseMaterial } from "./scene/materials";
import { createLandingOverlay } from "./ui/createLandingOverlay";
import { createUIPanel } from "./ui/createUIPanel";

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const { scene, camera, renderer, controls } = createThreeScene({
  canvasParent: document.body,
  width: window.innerWidth,
  height: window.innerHeight,
});

const baseMaterial = createBaseMaterial();
const shapeManager = new ShapeManager(scene, baseMaterial);

let mode: ToolMode = "navigate";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pieces = shapeManager.scenePieces;
const setPieces = (next: THREE.Mesh[]) => {
  pieces = next;
  shapeManager.scenePieces.length = 0;
  shapeManager.scenePieces.push(...next);
};

const cutManager = new CutManager(
  scene,
  camera,
  () => pieces,
  setPieces,
  () => shapeManager.activeMesh,
  (m) => {
    shapeManager.activeMesh = m;
  },
);

const dragManager = new DragManager(camera, raycaster, mouse);

const ui = createUIPanel();
ui.setVisible(false);

function setMode(next: ToolMode) {
  mode = next;
  controls.enabled = mode === "navigate" && !dragManager.dragging;
  ui.setModeLabel(mode);
}

createLandingOverlay({
  onStart: () => {
    ui.setVisible(true);
  },
});

ui.navigateBtn.addEventListener("click", () => setMode("navigate"));
ui.cutBtn.addEventListener("click", () => setMode("cut"));
ui.resetBtn.addEventListener("click", () =>
  shapeManager.createShape(ui.shapeSelect.value),
);
ui.shapeSelect.addEventListener("change", () =>
  shapeManager.createShape(ui.shapeSelect.value),
);

ui.gltfInput.addEventListener("change", () => {
  const file = ui.gltfInput.files?.[0];
  if (file) shapeManager.loadGLTFFile(file);
});

window.addEventListener("pointerdown", (event) => {
  const hits = getPointerHits({
    event,
    targets: pieces,
    mouse,
    raycaster,
    camera,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  if (hits.length === 0) return;

  const hit = hits[0];
  if (!(hit.object instanceof THREE.Mesh)) return;

  if (mode === "cut") {
    cutManager.startCutFromHit({ hitPoint: hit.point, mesh: hit.object });
    controls.enabled = false;
    return;
  }

  dragManager.startDragFromHit({ mesh: hit.object, hitPoint: hit.point });
  controls.enabled = false;
});

window.addEventListener("pointermove", (event) => {
  updateMouse(event, mouse, window.innerWidth, window.innerHeight);

  if (mode === "cut") {
    const active = shapeManager.activeMesh;
    if (!active) return;
    const point = getWorldPointOnPlane({
      event,
      plane: cutManager.getDragPlane(),
      target: new THREE.Vector3(),
      mouse,
      raycaster,
      camera,
      width: window.innerWidth,
      height: window.innerHeight,
    });
    if (point) cutManager.updateCutPoint(point);
    return;
  }

  if (dragManager.dragging) {
    dragManager.updateDrag(camera);
  }
});

window.addEventListener("pointerup", () => {
  if (mode === "cut") {
    cutManager.finishCut();
  }

  if (dragManager.dragging) {
    dragManager.finishDrag();
  }
  controls.enabled = mode === "navigate";
});

window.addEventListener("pointercancel", () => {
  dragManager.finishDrag();
  controls.enabled = mode === "navigate";
  cutManager.hideCutPreview();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    dragManager.finishDrag();
    cutManager.hideCutPreview();
    setMode("navigate");
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

shapeManager.createShape("box");
setMode("navigate");

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
