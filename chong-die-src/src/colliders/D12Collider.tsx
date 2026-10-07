import { ConvexHullCollider } from "@react-three/rapier";
import { COLLIDER_VERTICES } from "./colliderVertices";

const vertices = COLLIDER_VERTICES.D12.map((n) => n / 10);

export function D12Collider() {
  return <ConvexHullCollider args={[vertices]} />;
}
