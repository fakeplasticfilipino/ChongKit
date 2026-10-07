import { ConvexHullCollider } from "@react-three/rapier";
import { COLLIDER_VERTICES } from "./colliderVertices";

const vertices = COLLIDER_VERTICES.D20.map((n) => n / 10);

export function D20Collider() {
  return <ConvexHullCollider args={[vertices]} />;
}
