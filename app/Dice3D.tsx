"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./Dice3D.module.css";

type Dice3DProps = {
  disabled?: boolean;
  onResult: (value: number) => void;
};

type RollState = {
  startedAt: number;
  result: number;
  settleQuaternion: THREE.Quaternion | null;
};

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.34, 0.34], [0.34, -0.34]],
  3: [[-0.36, 0.36], [0, 0], [0.36, -0.36]],
  4: [[-0.34, 0.34], [0.34, 0.34], [-0.34, -0.34], [0.34, -0.34]],
  5: [[-0.36, 0.36], [0.36, 0.36], [0, 0], [-0.36, -0.36], [0.36, -0.36]],
  6: [[-0.34, 0.42], [0.34, 0.42], [-0.34, 0], [0.34, 0], [-0.34, -0.42], [0.34, -0.42]],
};

const FACE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

function Pip({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[0.13, 0.13, 0.045, 32]} />
      <meshStandardMaterial color="#100c08" roughness={0.48} metalness={0.04} />
    </mesh>
  );
}

function FacePips({ face, value }: { face: "+y" | "-y" | "+x" | "-x" | "+z" | "-z"; value: number }) {
  return (
    <>
      {PIP_LAYOUTS[value].map(([a, b], index) => {
        const scale = 1.08;
        const x = a * scale;
        const y = b * scale;
        if (face === "+y") return <Pip key={index} position={[x, 0.917, y]} />;
        if (face === "-y") return <Pip key={index} position={[x, -0.917, -y]} rotation={[Math.PI, 0, 0]} />;
        if (face === "+x") return <Pip key={index} position={[0.917, x, -y]} rotation={[0, 0, -Math.PI / 2]} />;
        if (face === "-x") return <Pip key={index} position={[-0.917, x, y]} rotation={[0, 0, Math.PI / 2]} />;
        if (face === "+z") return <Pip key={index} position={[x, y, 0.917]} rotation={[Math.PI / 2, 0, 0]} />;
        return <Pip key={index} position={[-x, y, -0.917]} rotation={[-Math.PI / 2, 0, 0]} />;
      })}
    </>
  );
}

function BrassDie({ disabled, onResult, rolling, setRolling }: Dice3DProps & { rolling: boolean; setRolling: (value: boolean) => void }) {
  const group = useRef<THREE.Group>(null);
  const state = useRef<RollState | null>(null);
  const finished = useRef(false);
  const { gl } = useThree();

  const targetQuaternions = useMemo(() => {
    const map = new Map<number, THREE.Quaternion>();
    Object.entries(FACE_ROTATIONS).forEach(([value, rotation]) => {
      map.set(Number(value), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation, "XYZ")));
    });
    return map;
  }, []);

  function beginRoll() {
    if (disabled || rolling || !group.current) return;
    const result = Math.floor(Math.random() * 6) + 1;
    state.current = { startedAt: performance.now(), result, settleQuaternion: null };
    finished.current = false;
    setRolling(true);
    gl.domElement.style.cursor = "default";
  }

  useFrame(() => {
    const die = group.current;
    const roll = state.current;
    if (!die || !roll || finished.current) return;

    const elapsed = (performance.now() - roll.startedAt) / 1000;
    const progress = Math.min(elapsed / 2.25, 1);
    const travel = 1 - Math.pow(1 - Math.min(progress / 0.8, 1), 3);

    die.position.x = THREE.MathUtils.lerp(-4.1, 0.95, travel);
    const mainArc = Math.sin(Math.min(progress / 0.77, 1) * Math.PI) * 2.2;
    const settleBounce = progress > 0.7 ? Math.abs(Math.sin((progress - 0.7) * 28)) * (1 - progress) * 1.55 : 0;
    die.position.y = 1.02 + mainArc + settleBounce;
    die.position.z = THREE.MathUtils.lerp(0.85, 0.15, travel);

    if (progress < 0.74) {
      die.rotation.x = progress * Math.PI * 10.4 + 0.35;
      die.rotation.y = progress * Math.PI * 8.2 + 0.7;
      die.rotation.z = progress * Math.PI * 9.1 - 0.3;
    } else {
      if (!roll.settleQuaternion) roll.settleQuaternion = die.quaternion.clone();
      const eased = 1 - Math.pow(1 - ((progress - 0.74) / 0.26), 4);
      die.quaternion.copy(roll.settleQuaternion).slerp(targetQuaternions.get(roll.result)!, eased);
    }

    if (progress >= 1) {
      die.position.set(0.95, 1.02, 0.15);
      die.quaternion.copy(targetQuaternions.get(roll.result)!);
      finished.current = true;
      state.current = null;
      window.setTimeout(() => {
        setRolling(false);
        onResult(roll.result);
      }, 340);
    }
  });

  return (
    <group
      ref={group}
      position={[-4.1, 1.02, 0.85]}
      rotation={[0.35, 0.7, -0.3]}
      onClick={(event) => { event.stopPropagation(); beginRoll(); }}
      onPointerOver={() => { if (!disabled && !rolling) gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { gl.domElement.style.cursor = "default"; }}
    >
      <RoundedBox args={[1.8, 1.8, 1.8]} radius={0.22} smoothness={7} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c18c38" roughness={0.22} metalness={0.72} clearcoat={0.46} clearcoatRoughness={0.2} />
      </RoundedBox>
      <FacePips face="+y" value={1} />
      <FacePips face="-y" value={6} />
      <FacePips face="+x" value={3} />
      <FacePips face="-x" value={4} />
      <FacePips face="+z" value={2} />
      <FacePips face="-z" value={5} />
    </group>
  );
}

export default function Dice3D({ disabled = false, onResult }: Dice3DProps) {
  const [rolling, setRolling] = useState(false);

  return (
    <div className={`${styles.root} ${rolling ? styles.rolling : ""}`}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 7.4, 7.8], fov: 31 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.86} />
        <directionalLight position={[-4, 9, 4]} intensity={3.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[4, 4, 4]} intensity={20} color="#e2b45d" distance={12} />
        <BrassDie disabled={disabled} onResult={onResult} rolling={rolling} setRolling={setRolling} />
        <ContactShadows position={[0, 0.055, 0]} opacity={0.54} scale={12} blur={2.5} far={6} />
      </Canvas>
      <div className={styles.instruction} aria-live="polite">
        <b>{rolling ? "Rolling…" : "Tap the brass die"}</b>
        <span>{rolling ? "Watch the top face as it settles" : "Roll 1–6 spaces"}</span>
      </div>
    </div>
  );
}
