import * as THREE from "three";
import { EPS } from "../core/constants";
import type { SliceResult, SliceVertex } from "../core/types";

function interpolateVertex(v1: SliceVertex, v2: SliceVertex): SliceVertex {
  const t = v1.d / (v1.d - v2.d);
  return {
    p: new THREE.Vector3().lerpVectors(v1.p, v2.p, t),
    n: new THREE.Vector3().lerpVectors(v1.n, v2.n, t).normalize(),
    uv: new THREE.Vector2().lerpVectors(v1.uv, v2.uv, t),
    d: 0,
  };
}

function clipPolygon(
  vertices: SliceVertex[],
  keepFront: boolean,
): SliceVertex[] {
  const output: SliceVertex[] = [];

  for (let i = 0; i < vertices.length; i += 1) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    const currInside = keepFront ? curr.d >= -EPS : curr.d <= EPS;
    const nextInside = keepFront ? next.d >= -EPS : next.d <= EPS;

    if (currInside && nextInside) {
      output.push(next);
    } else if (currInside && !nextInside) {
      output.push(interpolateVertex(curr, next));
    } else if (!currInside && nextInside) {
      output.push(interpolateVertex(curr, next));
      output.push(next);
    }
  }

  return output;
}

function triangulatePolygon(
  polygon: SliceVertex[],
  positions: number[],
  normals: number[],
  uvs: number[],
) {
  if (polygon.length < 3) return;

  const root = polygon[0];
  for (let i = 1; i < polygon.length - 1; i += 1) {
    const b = polygon[i];
    const c = polygon[i + 1];

    positions.push(
      root.p.x,
      root.p.y,
      root.p.z,
      b.p.x,
      b.p.y,
      b.p.z,
      c.p.x,
      c.p.y,
      c.p.z,
    );
    normals.push(
      root.n.x,
      root.n.y,
      root.n.z,
      b.n.x,
      b.n.y,
      b.n.z,
      c.n.x,
      c.n.y,
      c.n.z,
    );
    uvs.push(root.uv.x, root.uv.y, b.uv.x, b.uv.y, c.uv.x, c.uv.y);
  }
}

function createGeometryFromBuffers(
  positions: number[],
  normals: number[],
  uvs: number[],
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  if (normals.length === positions.length) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
  } else {
    geometry.computeVertexNormals();
  }

  if (uvs.length === (positions.length / 3) * 2) {
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeCap(points: THREE.Vector3[], planeNormal: THREE.Vector3) {
  const unique: THREE.Vector3[] = [];
  for (const p of points) {
    const exists = unique.some((q) => q.distanceToSquared(p) < 1e-6);
    if (!exists) unique.push(p.clone());
  }

  if (unique.length < 3) {
    return { positions: [] as number[], normals: [] as number[] };
  }

  const center = new THREE.Vector3();
  for (const p of unique) center.add(p);
  center.multiplyScalar(1 / unique.length);

  let tangent = new THREE.Vector3(1, 0, 0).cross(planeNormal);
  if (tangent.lengthSq() < EPS) {
    tangent = new THREE.Vector3(0, 1, 0).cross(planeNormal);
  }
  tangent.normalize();

  const bitangent = new THREE.Vector3()
    .crossVectors(planeNormal, tangent)
    .normalize();

  const ordered = unique
    .map((p) => {
      const rel = p.clone().sub(center);
      const x = rel.dot(tangent);
      const y = rel.dot(bitangent);
      return { p, angle: Math.atan2(y, x) };
    })
    .sort((a, b) => a.angle - b.angle)
    .map((v) => v.p);

  const positions: number[] = [];
  const normals: number[] = [];
  const n = planeNormal.clone().normalize();

  for (let i = 1; i < ordered.length - 1; i += 1) {
    const a = ordered[0];
    const b = ordered[i];
    const c = ordered[i + 1];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
  }

  return { positions, normals };
}

export class MeshCutter {
  sliceMeshByPlane(mesh: THREE.Mesh, plane: THREE.Plane): SliceResult {
    mesh.updateMatrixWorld(true);

    const worldGeometry = mesh.geometry.clone();
    worldGeometry.applyMatrix4(mesh.matrixWorld);
    const geometry = worldGeometry.toNonIndexed();

    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const normalAttr = geometry.getAttribute("normal") as
      | THREE.BufferAttribute
      | undefined;
    const uvAttr = geometry.getAttribute("uv") as
      | THREE.BufferAttribute
      | undefined;

    const frontPositions: number[] = [];
    const frontNormals: number[] = [];
    const frontUVs: number[] = [];

    const backPositions: number[] = [];
    const backNormals: number[] = [];
    const backUVs: number[] = [];

    const cutPoints: THREE.Vector3[] = [];

    for (let i = 0; i < posAttr.count; i += 3) {
      const p0 = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
      const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

      const n0 = normalAttr
        ? new THREE.Vector3().fromBufferAttribute(normalAttr, i)
        : new THREE.Vector3();
      const n1 = normalAttr
        ? new THREE.Vector3().fromBufferAttribute(normalAttr, i + 1)
        : new THREE.Vector3();
      const n2 = normalAttr
        ? new THREE.Vector3().fromBufferAttribute(normalAttr, i + 2)
        : new THREE.Vector3();

      if (!normalAttr) {
        const triNormal = new THREE.Triangle(p0, p1, p2).getNormal(
          new THREE.Vector3(),
        );
        n0.copy(triNormal);
        n1.copy(triNormal);
        n2.copy(triNormal);
      }

      const uv0 = uvAttr
        ? new THREE.Vector2().fromBufferAttribute(uvAttr, i)
        : new THREE.Vector2();
      const uv1 = uvAttr
        ? new THREE.Vector2().fromBufferAttribute(uvAttr, i + 1)
        : new THREE.Vector2();
      const uv2 = uvAttr
        ? new THREE.Vector2().fromBufferAttribute(uvAttr, i + 2)
        : new THREE.Vector2();

      const d0 = plane.distanceToPoint(p0);
      const d1 = plane.distanceToPoint(p1);
      const d2 = plane.distanceToPoint(p2);

      const tri = [
        { p: p0, n: n0, uv: uv0, d: d0 },
        { p: p1, n: n1, uv: uv1, d: d1 },
        { p: p2, n: n2, uv: uv2, d: d2 },
      ] as SliceVertex[];

      const allFront = tri.every((v) => v.d >= -EPS);
      const allBack = tri.every((v) => v.d <= EPS);

      if (allFront) {
        triangulatePolygon(tri, frontPositions, frontNormals, frontUVs);
        continue;
      }

      if (allBack) {
        triangulatePolygon(tri, backPositions, backNormals, backUVs);
        continue;
      }

      const frontPoly = clipPolygon(tri, true);
      const backPoly = clipPolygon(tri, false);

      triangulatePolygon(frontPoly, frontPositions, frontNormals, frontUVs);
      triangulatePolygon(backPoly, backPositions, backNormals, backUVs);

      for (let j = 0; j < tri.length; j += 1) {
        const a = tri[j];
        const b = tri[(j + 1) % tri.length];
        if ((a.d > EPS && b.d < -EPS) || (a.d < -EPS && b.d > EPS)) {
          const t = a.d / (a.d - b.d);
          cutPoints.push(new THREE.Vector3().lerpVectors(a.p, b.p, t));
        }
      }
    }

    // const planeNormal = plane.normal.clone().normalize();
    // const capFront = makeCap(cutPoints, planeNormal);
    // const capBack = makeCap(cutPoints, planeNormal.clone().negate());

    // frontPositions.push(...capFront.positions);
    // frontNormals.push(...capFront.normals);
    // backPositions.push(...capBack.positions);
    // backNormals.push(...capBack.normals);

    const frontGeo = createGeometryFromBuffers(
      frontPositions,
      frontNormals,
      frontUVs,
    );
    const backGeo = createGeometryFromBuffers(
      backPositions,
      backNormals,
      backUVs,
    );

    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    frontGeo.applyMatrix4(inv);
    backGeo.applyMatrix4(inv);
    frontGeo.computeVertexNormals();
    backGeo.computeVertexNormals();

    return { front: frontGeo, back: backGeo };
  }
}
