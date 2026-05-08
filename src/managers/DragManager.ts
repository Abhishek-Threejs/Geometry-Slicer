import * as THREE from "three";

export class DragManager {
  private isDraggingPiece = false;
  private dragContext: {
    mesh: THREE.Mesh;
    plane: THREE.Plane;
    offset: THREE.Vector3;
  } | null = null;

  private readonly camera: THREE.Camera;
  private readonly raycaster: THREE.Raycaster;
  private readonly mouse: THREE.Vector2;

  constructor(
    camera: THREE.Camera,
    raycaster: THREE.Raycaster,
    mouse: THREE.Vector2,
  ) {
    this.camera = camera;
    this.raycaster = raycaster;
    this.mouse = mouse;
  }

  get dragging() {
    return this.isDraggingPiece;
  }

  startDragFromHit(args: { mesh: THREE.Mesh; hitPoint: THREE.Vector3 }) {
    const dragPlaneNormal = new THREE.Vector3();
    this.camera.getWorldDirection(dragPlaneNormal);
    dragPlaneNormal.negate();

    this.dragContext = {
      mesh: args.mesh,
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(
        dragPlaneNormal,
        args.hitPoint,
      ),
      offset: args.mesh.position.clone().sub(args.hitPoint),
    };

    this.isDraggingPiece = true;
  }

  updateDrag(camera: THREE.Camera) {
    if (!this.dragContext) return;
    this.raycaster.setFromCamera(this.mouse, camera);

    const worldPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(
      this.dragContext.plane,
      worldPoint,
    );
    if (!hit) return;

    this.dragContext.mesh.position.copy(
      worldPoint.add(this.dragContext.offset),
    );
  }

  finishDrag() {
    this.dragContext = null;
    this.isDraggingPiece = false;
  }
}
