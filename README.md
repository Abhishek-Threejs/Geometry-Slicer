# Geometry Slicer

Desktop-style web tool to slice 3D meshes in real time using mouse gestures. Built with **Three.js + TypeScript + Vite**.

## Features

- **Navigate / Cut modes** with a small HUD
- **Orbit controls** (disabled while cutting / dragging pieces)
- **Primitive shapes**: box, sphere, cylinder, torus
- **GLTF/GLB upload** (local file input)
- **Cut preview line** while dragging
- **Post-cut dragging**: each piece is independently draggable via raycasting

## Tech stack

- **Renderer**: Three.js (`MeshStandardMaterial` / PBR-style shading)
- **Language**: TypeScript
- **Bundler**: Vite
- **Slicing**: custom implementation (no external slicing libraries)

> Note: `three-bvh-csg` exists in `package.json`, but this project’s slicing logic does **not** use it.

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## How cutting works (geometry slicing approach)

### 1) Cutting plane derivation (mouse drag → 3D plane)

- On pointer-down in **Cut** mode, we raycast into the mesh and record the **world-space hit point** as the start.
- While dragging, we project the pointer onto a plane facing the camera (a “drag plane”) to get a stable end point in world space.
- The cutting plane normal is computed from:
  - \( \text{dragDir} = \text{normalize}(end - start) \)
  - \( \text{cameraDir} \) from the active camera
  - \( \text{planeNormal} = \text{normalize}(\text{dragDir} \times \text{cameraDir}) \)
  - If degenerate, we fall back to a cross with world-up.
- The plane is placed near the mesh center (lerped with the drag midpoint) to avoid unstable cuts when dragging near edges.

Code: `src/core/threeUtils.ts` (`computeCutPlane`)

### 2) Vertex classification

In `MeshCutter`, for each triangle:

- Convert to **non-indexed** triangles.
- Compute signed distances \(d\) of triangle vertices to the plane via `plane.distanceToPoint(p)`.
- If all vertices are on one side: send triangle to that side.
- If the triangle straddles the plane: clip it into a polygon on each side using a Sutherland–Hodgman style clip, inserting intersection vertices by linear interpolation.

Code: `src/slicing/MeshCutter.ts`

### 3) Re-triangulation

Clipped polygons are triangulated using a simple **fan triangulation** (root vertex + pairs).

### 4) Cap generation (closing the cut)

To close the open surface created by slicing:

- Collect all segment intersection points produced by edges crossing the plane.
- Remove near-duplicates (epsilon merge).
- Compute the centroid.
- Build a 2D ordering by projecting points onto a plane basis (tangent/bitangent) and sorting by angle around the centroid.
- Triangulate the ordered ring into a cap (fan), emitting normals aligned to the plane normal (and the opposite normal for the back side).

This is a pragmatic cap approach that works well for many models but can fail for highly complex/self-intersecting cut loops.

## Architecture (systems-level design)

- **UI layer**
  - `src/ui/createLandingOverlay.ts`: title screen + start
  - `src/ui/createUIPanel.ts`: HUD, mode buttons, shape switcher, file input

- **Scene setup**
  - `src/scene/createThreeScene.ts`: renderer/camera/controls + lights + helpers
  - `src/scene/materials.ts`: base material factory

- **Managers**
  - `src/managers/ShapeManager.ts`
    - Owns `scenePieces` list and `activeMesh`
    - Spawns primitives and loads GLTF into sliceable meshes
  - `src/managers/CutManager.ts`
    - Owns cut state (start/end/preview), manages target selection, and replaces meshes with slice results
    - Delegates geometry slicing to `MeshCutter`
  - `src/slicing/MeshCutter.ts`
    - Generic slicing pipeline: accepts any `THREE.Mesh` + `THREE.Plane` → `{ front, back }` geometries
  - `src/managers/DragManager.ts`
    - Click-to-drag pieces using a camera-facing drag plane

- **Bootstrap**
  - `src/main.ts`: wires UI ↔ managers ↔ scene, registers events, starts render loop

## Tradeoffs / simplifications

- **Cap robustness**: cap triangulation assumes a single coherent loop and uses angle sorting; complex cuts can generate multiple loops or non-manifold cases.
- **Materials**: pieces inherit the first material when slicing multi-material meshes.
- **UVs on caps**: caps currently do not generate meaningful UVs.

## Scaling plan (supporting many models/shapes)

- Keep `MeshCutter` stateless and reusable (already separated).
- Add a lightweight “part registry” to track metadata per piece (source model, slice depth, etc.).
- Optionally add acceleration structures for picking (BVH) if models become heavy (without changing slicing rules).

## Performance considerations

- Slicing cost scales with **triangle count** because we convert to non-indexed and process every triangle.
- Main optimizations to consider next:
  - Restrict slicing to meshes whose bounding boxes intersect the plane (already done in `CutManager`)
  - Avoid repeated allocations (pool vectors / reuse arrays)
  - Optional: build a BVH for raycasting and/or to reduce triangle iteration (future work)

## Known issues

- Extremely high-poly GLTF meshes can be slow to slice.
- Cap generation can produce imperfect results for complex intersections (multiple loops / thin triangles).
