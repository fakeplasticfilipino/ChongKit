import { ConvexHullCollider } from "@react-three/rapier";
import { COLLIDER_VERTICES } from "./colliderVertices";

const vertices = COLLIDER_VERTICES.D4.map((n) => n / 10);

export function D4Collider() {
  return <ConvexHullCollider args={[vertices]} />;
}
