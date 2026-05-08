import * as THREE from "three";
import type { SliceResult } from "../core/types";
import {
  computeCutPlane,
  disposeMaterial,
  setupPieceMesh,
} from "../core/threeUtils";
import { MeshCutter } from "../slicing/MeshCutter";

function makePiece(
  geometry: THREE.BufferGeometry,
  sourceMaterial: THREE.Material,
) {
  const mesh = new THREE.Mesh(geometry, sourceMaterial.clone());
  setupPieceMesh(mesh);
  return mesh;
}

export class CutManager {
  private cutStart = new THREE.Vector3();
  private cutEnd = new THREE.Vector3();
  private cutDragPlane = new THREE.Plane();
  private isCutting = false;
  private cutLinePreview: THREE.Line | null = null;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly getPieces: () => THREE.Mesh[];
  private readonly setPieces: (pieces: THREE.Mesh[]) => void;
  private readonly getActiveMesh: () => THREE.Mesh | null;
  private readonly setActiveMesh: (mesh: THREE.Mesh | null) => void;
  private readonly cutter: MeshCutter;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    getPieces: () => THREE.Mesh[],
    setPieces: (pieces: THREE.Mesh[]) => void,
    getActiveMesh: () => THREE.Mesh | null,
    setActiveMesh: (mesh: THREE.Mesh | null) => void,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.getPieces = getPieces;
    this.setPieces = setPieces;
    this.getActiveMesh = getActiveMesh;
    this.setActiveMesh = setActiveMesh;
    this.cutter = new MeshCutter();
  }

  showCutPreview(start: THREE.Vector3, end: THREE.Vector3) {
    if (this.cutLinePreview) {
      this.scene.remove(this.cutLinePreview);
      this.cutLinePreview.geometry.dispose();
      disposeMaterial(this.cutLinePreview.material);
      this.cutLinePreview = null;
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      start.clone(),
      end.clone(),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x22c55e,
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });

    this.cutLinePreview = new THREE.Line(lineGeo, lineMat);
    this.cutLinePreview.computeLineDistances();
    this.cutLinePreview.renderOrder = 999;
    this.scene.add(this.cutLinePreview);
  }

  hideCutPreview() {
    if (!this.cutLinePreview) return;
    this.scene.remove(this.cutLinePreview);
    this.cutLinePreview.geometry.dispose();
    disposeMaterial(this.cutLinePreview.material);
    this.cutLinePreview = null;
  }

  startCutFromHit(args: { hitPoint: THREE.Vector3; mesh: THREE.Mesh }) {
    this.setActiveMesh(args.mesh);
    this.isCutting = true;

    this.cutStart.copy(args.hitPoint);
    this.cutEnd.copy(args.hitPoint);

    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    this.cutDragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      cameraDir.clone().negate(),
      args.hitPoint,
    );
  }

  getDragPlane() {
    return this.cutDragPlane;
  }

  updateCutPoint(point: THREE.Vector3) {
    if (!this.isCutting || !this.getActiveMesh()) return;
    this.cutEnd.copy(point);
    this.showCutPreview(this.cutStart, this.cutEnd);
  }

  finishCut() {
    if (!this.isCutting) {
      this.isCutting = false;
      return;
    }

    const pieces = this.getPieces();
    const active = this.getActiveMesh() ?? pieces[0];
    if (!active) {
      this.isCutting = false;
      this.hideCutPreview();
      return;
    }

    const { plane } = computeCutPlane({
      start: this.cutStart,
      end: this.cutEnd,
      mesh: active,
      camera: this.camera,
    });

    const targets = pieces.filter((mesh) => {
      const box = new THREE.Box3().setFromObject(mesh);
      return plane.intersectsBox(box);
    });

    if (targets.length === 0) {
      this.isCutting = false;
      this.hideCutPreview();
      return;
    }

    const nextPieces = [...pieces];

    const targetsSnapshot = [...targets];
    for (const mesh of targetsSnapshot) {
      if (!nextPieces.includes(mesh)) continue;
      const result = this.cutter.sliceMeshByPlane(mesh, plane);
      this.replaceMeshWithSlice(nextPieces, mesh, result);
    }

    this.setPieces(nextPieces);
    this.isCutting = false;
    this.hideCutPreview();
  }

  private replaceMeshWithSlice(
    pieces: THREE.Mesh[],
    mesh: THREE.Mesh,
    result: SliceResult,
  ) {
    const parent = mesh.parent ?? this.scene;
    const material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;

    const frontMesh = makePiece(result.front, material);
    const backMesh = makePiece(result.back, material);

    frontMesh.position.copy(mesh.position);
    frontMesh.quaternion.copy(mesh.quaternion);
    frontMesh.scale.copy(mesh.scale);

    backMesh.position.copy(mesh.position);
    backMesh.quaternion.copy(mesh.quaternion);
    backMesh.scale.copy(mesh.scale);

    const nudge = new THREE.Vector3();
    parent.getWorldDirection(nudge);
    nudge.multiplyScalar(0.005);
    frontMesh.position.add(nudge);
    backMesh.position.addScaledVector(nudge, -1);

    parent.add(frontMesh);
    parent.add(backMesh);

    this.scene.remove(mesh);
    mesh.geometry.dispose();
    disposeMaterial(mesh.material);

    const index = pieces.indexOf(mesh);
    if (index >= 0) pieces.splice(index, 1);
    pieces.push(frontMesh, backMesh);
    this.setActiveMesh(frontMesh);
  }
}
