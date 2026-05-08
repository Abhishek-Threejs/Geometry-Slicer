import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ThreeSceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export function createThreeScene(args: {
  canvasParent: HTMLElement;
  width: number;
  height: number;
}): ThreeSceneBundle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#101114");

  const camera = new THREE.PerspectiveCamera(
    60,
    args.width / args.height,
    0.1,
    500,
  );
  camera.position.set(6, 5, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(args.width, args.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  args.canvasParent.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(6, 10, 4);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  scene.add(dirLight);

  const grid = new THREE.GridHelper(60, 60, 0x444444, 0x222222);
  scene.add(grid);

  const axes = new THREE.AxesHelper(2.5);
  axes.position.y = 0.01;
  scene.add(axes);

  return { scene, camera, renderer, controls };
}
