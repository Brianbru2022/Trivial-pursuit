"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useRef, useState } from "react";
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
  targetQuaternion: THREE.Quaternion | null;
};

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.34, 0.34], [0.34, -0.34]],
  3: [[-0.36, 0.36], [0, 0], [0.36, -0.36]],
  4: [[-0.34, 0.34], [0.34, 0.34], [-0.34, -0.34], [0.34, -0.34]],
  5: [[-0.36, 0.36], [0.36, 0.36], [0, 0], [-0.36, -0.36], [0.36, -0.36]],
  6: [[-0.34, 0.42], [0.34, 0.42], [-0.34, 0], [0.34, 0], [-0.34, -0.42], [0.34, -0.42]],
};

const FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  2: new THREE.Vector3(0, 0, 1),
  5: new THREE.Vector3(0, 0, -1),
};

function Pip({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[0.105, 0.105, 0.042, 28]} />
      <meshStandardMaterial color="#0b0805" roughness={0.4} metalness={0.02} />
    </mesh>
  );
}

function FacePips({ face, value }: { face: "+y" | "-y" | "+x" | "-x" | "+z" | "-z"; value: number }) {
  return (
    <>
      {PIP_LAYOUTS[value].map(([a, b], index) => {
        const scale = 0.92;
        const x = a * scale;
        const y = b * scale;
        if (face === "+y") return <Pip key={index} position={[x, 0.662, y]} />;
        if (face === "-y") return <Pip key={index} position={[x, -0.662, -y]} rotation={[Math.PI, 0, 0]} />;
        if (face === "+x") return <Pip key={index} position={[0.662, x, -y]} rotation={[0, 0, -Math.PI / 2]} />;
        if (face === "-x") return <Pip key={index} position={[-0.662, x, y]} rotation={[0, 0, Math.PI / 2]} />;
        if (face === "+z") return <Pip key={index} position={[x, y, 0.662]} rotation={[Math.PI / 2, 0, 0]} />;
        return <Pip key={index} position={[-x, y, -0.662]} rotation={[-Math.PI / 2, 0, 0]} />;
      })}
    </>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useFrame(() => camera.lookAt(0, 0.62, 0));
  return null;
}

function BrassDie({ disabled, onResult, rolling, setRolling, setVisibleResult, setFlying }: Dice3DProps & {
  rolling: boolean;
  setRolling: (value: boolean) => void;
  setVisibleResult: (value: number | null) => void;
  setFlying: (value: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const state = useRef<RollState | null>(null);
  const finished = useRef(false);
  const { gl, camera } = useThree();

  function makeCameraFacingQuaternion(result: number, position: THREE.Vector3) {
    const faceNormal = FACE_NORMALS[result].clone().normalize();
    const cameraDirection = camera.position.clone().sub(position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(faceNormal, cameraDirection);
  }

  function beginRoll() {
    if (disabled || rolling || !group.current) return;
    const result = Math.floor(Math.random() * 6) + 1;
    setVisibleResult(null);
    setFlying(false);
    state.current = { startedAt: performance.now(), result, settleQuaternion: null, targetQuaternion: null };
    finished.current = false;
    setRolling(true);
    gl.domElement.style.cursor = "default";
  }

  useFrame(() => {
    const die = group.current;
    const roll = state.current;
    if (!die || !roll || finished.current) return;

    const elapsed = (performance.now() - roll.startedAt) / 1000;
    const progress = Math.min(elapsed / 1.9, 1);
    const travel = 1 - Math.pow(1 - Math.min(progress / 0.79, 1), 3);

    die.position.x = THREE.MathUtils.lerp(-1.35, 0.5, travel);
    die.position.z = THREE.MathUtils.lerp(0.45, -0.02, travel);
    const mainArc = Math.sin(Math.min(progress / 0.76, 1) * Math.PI) * 1.15;
    const settleBounce = progress > 0.72 ? Math.abs(Math.sin((progress - 0.72) * 25)) * (1 - progress) * 0.65 : 0;
    die.position.y = 0.72 + mainArc + settleBounce;

    if (progress < 0.73) {
      die.rotation.x = progress * Math.PI * 9 + 0.25;
      die.rotation.y = progress * Math.PI * 7 + 0.45;
      die.rotation.z = progress * Math.PI * 8 - 0.2;
    } else {
      if (!roll.settleQuaternion) {
        roll.settleQuaternion = die.quaternion.clone();
        roll.targetQuaternion = makeCameraFacingQuaternion(roll.result, new THREE.Vector3(0.5, 0.72, -0.02));
      }
      const eased = 1 - Math.pow(1 - ((progress - 0.73) / 0.27), 4);
      die.quaternion.copy(roll.settleQuaternion).slerp(roll.targetQuaternion!, eased);
    }

    if (progress >= 1) {
      die.position.set(0.5, 0.72, -0.02);
      die.quaternion.copy(makeCameraFacingQuaternion(roll.result, die.position));
      finished.current = true;
      state.current = null;
      setVisibleResult(roll.result);
      window.setTimeout(() => setFlying(true), 520);
      window.setTimeout(() => {
        setRolling(false);
        onResult(roll.result);
      }, 1350);
    }
  });

  return (
    <group
      ref={group}
      position={[-1.35, 0.72, 0.45]}
      rotation={[0.25, 0.45, -0.2]}
      scale={[0.82, 0.82, 0.82]}
      onClick={(event) => { event.stopPropagation(); beginRoll(); }}
      onPointerOver={() => { if (!disabled && !rolling) gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { gl.domElement.style.cursor = "default"; }}
    >
      <RoundedBox args={[1.28, 1.28, 1.28]} radius={0.16} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial color="#bd8733" roughness={0.25} metalness={0.68} clearcoat={0.35} clearcoatRoughness={0.22} />
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

function ResultFace({ value }: { value: number }) {
  return (
    <div className={styles.flatDieFace} aria-label={`Rolled ${value}`}>
      {PIP_LAYOUTS[value].map(([x, y], index) => (
        <span
          key={index}
          className={styles.flatPip}
          style={{ left: `${50 + x * 68}%`, top: `${50 - y * 68}%` }}
        />
      ))}
    </div>
  );
}

export function DiceResultIcon({ value }: { value: number }) {
  return (
    <div className={styles.persistentResult} aria-label={`Last roll ${value}`}>
      <ResultFace value={value} />
    </div>
  );
}

export default function Dice3D({ disabled = false, onResult }: Dice3DProps) {
  const [rolling, setRolling] = useState(false);
  const [visibleResult, setVisibleResult] = useState<number | null>(null);
  const [flying, setFlying] = useState(false);

  return (
    <div className={`${styles.root} ${rolling ? styles.rolling : ""}`}>
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 3.5, 8.5], fov: 39 }} gl={{ antialias: true, alpha: true }}>
        <CameraRig />
        <ambientLight intensity={0.9} />
        <directionalLight position={[-4, 7, 5]} intensity={3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[3, 3, 4]} intensity={13} color="#e0ac55" distance={10} />
        <BrassDie
          disabled={disabled}
          onResult={onResult}
          rolling={rolling}
          setRolling={setRolling}
          setVisibleResult={setVisibleResult}
          setFlying={setFlying}
        />
        <ContactShadows position={[0, 0.035, 0]} opacity={0.46} scale={8} blur={2.5} far={5} />
      </Canvas>

      {visibleResult !== null && (
        <div className={`${styles.flyawayDie} ${flying ? styles.flyawayActive : ""}`}>
          <ResultFace value={visibleResult} />
        </div>
      )}

      <div className={styles.instruction} aria-live="polite">
        <b>{rolling ? (visibleResult ? `You rolled ${visibleResult}` : "Rolling…") : "Tap the brass die"}</b>
        <span>{rolling ? "The rolled face is presented to you" : "Roll 1–6 spaces"}</span>
      </div>
    </div>
  );
}
