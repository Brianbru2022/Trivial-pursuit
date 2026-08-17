"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

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
      <cylinderGeometry args={[0.105, 0.105, 0.035, 28]} />
      <meshStandardMaterial color="#21170d" roughness={0.62} metalness={0.08} />
    </mesh>
  );
}

function FacePips({ face, value }: { face: "+y" | "-y" | "+x" | "-x" | "+z" | "-z"; value: number }) {
  const pips = PIP_LAYOUTS[value];
  return (
    <>
      {pips.map(([a, b], index) => {
        if (face === "+y") return <Pip key={index} position={[a, 0.817, b]} />;
        if (face === "-y") return <Pip key={index} position={[a, -0.817, -b]} rotation={[Math.PI, 0, 0]} />;
        if (face === "+x") return <Pip key={index} position={[0.817, a, -b]} rotation={[0, 0, -Math.PI / 2]} />;
        if (face === "-x") return <Pip key={index} position={[-0.817, a, b]} rotation={[0, 0, Math.PI / 2]} />;
        if (face === "+z") return <Pip key={index} position={[a, b, 0.817]} rotation={[Math.PI / 2, 0, 0]} />;
        return <Pip key={index} position={[-a, b, -0.817]} rotation={[-Math.PI / 2, 0, 0]} />;
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
      const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], "XYZ");
      map.set(Number(value), new THREE.Quaternion().setFromEuler(euler));
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
    const duration = 2.1;
    const progress = Math.min(elapsed / duration, 1);
    const travel = 1 - Math.pow(1 - Math.min(progress / 0.78, 1), 3);

    die.position.x = THREE.MathUtils.lerp(-2.65, 1.55, travel);
    const mainArc = Math.sin(Math.min(progress / 0.76, 1) * Math.PI) * 1.6;
    const settleBounce = progress > 0.72 ? Math.abs(Math.sin((progress - 0.72) * 26)) * (1 - progress) * 1.25 : 0;
    die.position.y = 0.88 + mainArc + settleBounce;
    die.position.z = THREE.MathUtils.lerp(0.35, -0.22, travel);

    if (progress < 0.74) {
      die.rotation.x = progress * Math.PI * 9.6 + 0.35;
      die.rotation.y = progress * Math.PI * 7.1 + 0.7;
      die.rotation.z = progress * Math.PI * 8.2 - 0.3;
    } else {
      if (!roll.settleQuaternion) roll.settleQuaternion = die.quaternion.clone();
      const settleProgress = (progress - 0.74) / 0.26;
      const eased = 1 - Math.pow(1 - settleProgress, 4);
      die.quaternion.copy(roll.settleQuaternion).slerp(targetQuaternions.get(roll.result)!, eased);
    }

    if (progress >= 1) {
      die.position.set(1.55, 0.88, -0.22);
      die.quaternion.copy(targetQuaternions.get(roll.result)!);
      finished.current = true;
      state.current = null;
      window.setTimeout(() => {
        setRolling(false);
        onResult(roll.result);
      }, 220);
    }
  });

  return (
    <group
      ref={group}
      position={[-2.65, 0.88, 0.35]}
      rotation={[0.35, 0.7, -0.3]}
      onClick={(event) => {
        event.stopPropagation();
        beginRoll();
      }}
      onPointerOver={() => {
        if (!disabled && !rolling) gl.domElement.style.cursor = "pointer";
      }}
      onPointerOut={() => { gl.domElement.style.cursor = "default"; }}
    >
      <RoundedBox args={[1.6, 1.6, 1.6]} radius={0.19} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#b78432"
          roughness={0.26}
          metalness={0.76}
          clearcoat={0.38}
          clearcoatRoughness={0.24}
        />
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
    <div className={`dice3d ${rolling ? "isRolling" : ""}`}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 4.6, 7.2], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.78} />
        <directionalLight position={[-4, 7, 4]} intensity={3.4} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[4, 3, 3]} intensity={16} color="#d9a64d" distance={9} />
        <BrassDie disabled={disabled} onResult={onResult} rolling={rolling} setRolling={setRolling} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[9, 5]} />
          <shadowMaterial transparent opacity={0.18} />
        </mesh>
        <ContactShadows position={[0, 0.035, 0]} opacity={0.48} scale={8} blur={2.8} far={4} />
        <Environment preset="warehouse" />
      </Canvas>
      <div className="diceInstruction" aria-live="polite">
        <b>{rolling ? "Rolling…" : "Tap the brass die"}</b>
        <span>{rolling ? "The result will settle naturally" : "Roll 1–6 spaces"}</span>
      </div>
    </div>
  );
}
