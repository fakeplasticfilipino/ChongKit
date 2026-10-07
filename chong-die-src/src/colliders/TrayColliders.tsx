import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { TRAY_BODIES } from "./trayShape";

export function TrayColliders(props: JSX.IntrinsicElements["group"]) {
  return (
    <group {...props}>
      {TRAY_BODIES.map((body) => (
        <RigidBody
          key={body.material}
          type="fixed"
          friction={body.friction}
          restitution={body.restitution}
          userData={{ material: body.material }}
        >
          {body.boxes.map((box, i) => (
            <CuboidCollider
              key={i}
              args={box.args}
              position={box.position}
              rotation={box.rotation}
            />
          ))}
        </RigidBody>
      ))}
    </group>
  );
}
