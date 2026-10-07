import { ConvexHullCollider } from "@react-three/rapier";
import { COLLIDER_VERTICES } from "./colliderVertices";

const vertices = COLLIDER_VERTICES.D8.map((n) => n / 10);

export function D8Collider() {
  return <ConvexHullCollider args={[vertices]} />;
}
