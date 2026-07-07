import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeMaterial, setupPieceMesh } from "../core/threeUtils";

export class ShapeManager {
  private readonly loader: GLTFLoader;

  public readonly scenePieces: THREE.Mesh[] = [];
  public activeMesh: THREE.Mesh | null = null;

  private readonly scene: THREE.Scene;
  private readonly baseMaterial: THREE.Material;

  constructor(scene: THREE.Scene, baseMaterial: THREE.Material) {
    this.scene = scene;
    this.baseMaterial = baseMaterial;
    this.loader = new GLTFLoader();
  }

  clear() {
    for (const piece of this.scenePieces) {
      this.scene.remove(piece);
      piece.geometry.dispose();
      disposeMaterial(piece.material);
    }

    this.scenePieces.length = 0;
    this.activeMesh = null;
  }

  createShape(kind: string) {
    this.clear();

    let geometry: THREE.BufferGeometry;
    switch (kind) {
      case "sphere":
        geometry = new THREE.SphereGeometry(1.05, 48, 32);
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 48, 1, false);
        break;
      case "torus":
        geometry = new THREE.TorusGeometry(1.05, 0.38, 24, 96);
        break;
      case "box":
      default:
        geometry = new THREE.BoxGeometry(2.1, 2.1, 2.1, 1, 1, 1);
        break;
    }

    const mesh = new THREE.Mesh(geometry, this.baseMaterial.clone());
    mesh.position.set(0, 1.15, 0);
    setupPieceMesh(mesh);
    this.scene.add(mesh);
    this.scenePieces.push(mesh);
    this.activeMesh = mesh;
  }

  loadGLTFFile(file: File) {
    const url = URL.createObjectURL(file);
    this.loader.load(
      url,
      (gltf) => {
        URL.revokeObjectURL(url);
        this.clear();

        const root = gltf.scene;
        root.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        const maxAxis = Math.max(size.x, size.y, size.z) || 1;
        const scale = 3.0 / maxAxis;

        root.scale.setScalar(scale);
        root.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(root);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

        root.position.sub(scaledCenter);
        root.updateMatrixWorld(true);

        const meshes: THREE.Mesh[] = [];
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            meshes.push(obj);
          }
        });

        for (const original of meshes) {
          const geometry = original.geometry.clone();
          geometry.applyMatrix4(original.matrixWorld);

          // const mesh = new THREE.Mesh(geometry, this.baseMaterial.clone());
          original.position.set(0, 0, 0);
          setupPieceMesh(original);
          this.scene.add(original);
          this.scenePieces.push(original);
        }

        this.activeMesh = this.scenePieces[0] ?? null;
      },
      undefined,
      (error) => {
        URL.revokeObjectURL(url);
        console.error("GLTF load failed", error);
      },
    );
  }
}
