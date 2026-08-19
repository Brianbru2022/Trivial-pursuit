"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./Dice3D.module.css";

type Dice3DProps = { disabled?: boolean; onResult: (value: number) => void };
type RollState = { startedAt: number; result: number; settleQuaternion: THREE.Quaternion | null; targetQuaternion: THREE.Quaternion | null };

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-.34, .34], [.34, -.34]],
  3: [[-.36, .36], [0, 0], [.36, -.36]],
  4: [[-.34, .34], [.34, .34], [-.34, -.34], [.34, -.34]],
  5: [[-.36, .36], [.36, .36], [0, 0], [-.36, -.36], [.36, -.36]],
  6: [[-.34, .42], [.34, .42], [-.34, 0], [.34, 0], [-.34, -.42], [.34, -.42]],
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
  return <mesh position={position} rotation={rotation} castShadow><cylinderGeometry args={[.105, .105, .042, 28]} /><meshStandardMaterial color="#0b0805" roughness={.4} metalness={.02} /></mesh>;
}

function FacePips({ face, value }: { face: "+y" | "-y" | "+x" | "-x" | "+z" | "-z"; value: number }) {
  return <>{PIP_LAYOUTS[value].map(([a, b], i) => {
    const x = a * .92, y = b * .92;
    if (face === "+y") return <Pip key={i} position={[x, .662, y]} />;
    if (face === "-y") return <Pip key={i} position={[x, -.662, -y]} rotation={[Math.PI, 0, 0]} />;
    if (face === "+x") return <Pip key={i} position={[.662, x, -y]} rotation={[0, 0, -Math.PI / 2]} />;
    if (face === "-x") return <Pip key={i} position={[-.662, x, y]} rotation={[0, 0, Math.PI / 2]} />;
    if (face === "+z") return <Pip key={i} position={[x, y, .662]} rotation={[Math.PI / 2, 0, 0]} />;
    return <Pip key={i} position={[-x, y, -.662]} rotation={[-Math.PI / 2, 0, 0]} />;
  })}</>;
}

function CameraRig() {
  const { camera } = useThree();
  useFrame(() => camera.lookAt(0, .62, 0));
  return null;
}

function BrassDie({ disabled, onResult, rolling, setRolling, setVisibleResult, setFlying, trigger }: Dice3DProps & { rolling: boolean; setRolling: (v: boolean) => void; setVisibleResult: (v: number | null) => void; setFlying: (v: boolean) => void; trigger: number }) {
  const group = useRef<THREE.Group>(null);
  const state = useRef<RollState | null>(null);
  const finished = useRef(false);
  const { gl, camera } = useThree();

  function facing(result: number, pos: THREE.Vector3) {
    return new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[result].clone().normalize(), camera.position.clone().sub(pos).normalize());
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

  useEffect(() => {
    if (trigger > 0) beginRoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useFrame(() => {
    const die = group.current, roll = state.current;
    if (!die) return;
    if (!roll) { die.scale.lerp(new THREE.Vector3(.52, .52, .52), .12); return; }
    const elapsed = (performance.now() - roll.startedAt) / 1000;
    const progress = Math.min(elapsed / 1.9, 1);
    const travel = 1 - Math.pow(1 - Math.min(progress / .79, 1), 3);
    const rollScale = .52 + Math.sin(Math.min(progress / .82, 1) * Math.PI) * .28;
    die.scale.lerp(new THREE.Vector3(rollScale, rollScale, rollScale), .3);
    if (finished.current) return;
    die.position.x = THREE.MathUtils.lerp(-1.35, .5, travel);
    die.position.z = THREE.MathUtils.lerp(.45, -.02, travel);
    die.position.y = .72 + Math.sin(Math.min(progress / .76, 1) * Math.PI) * 1.15 + (progress > .72 ? Math.abs(Math.sin((progress - .72) * 25)) * (1 - progress) * .65 : 0);
    if (progress < .73) {
      die.rotation.x = progress * Math.PI * 9 + .25;
      die.rotation.y = progress * Math.PI * 7 + .45;
      die.rotation.z = progress * Math.PI * 8 - .2;
    } else {
      if (!roll.settleQuaternion) {
        roll.settleQuaternion = die.quaternion.clone();
        roll.targetQuaternion = facing(roll.result, new THREE.Vector3(.5, .72, -.02));
      }
      const eased = 1 - Math.pow(1 - ((progress - .73) / .27), 4);
      die.quaternion.copy(roll.settleQuaternion).slerp(roll.targetQuaternion!, eased);
    }
    if (progress >= 1) {
      die.position.set(.5, .72, -.02);
      die.quaternion.copy(facing(roll.result, die.position));
      die.scale.set(.6, .6, .6);
      finished.current = true;
      state.current = null;
      setVisibleResult(roll.result);
      window.setTimeout(() => setFlying(true), 520);
      window.setTimeout(() => { setRolling(false); onResult(roll.result); }, 1350);
    }
  });

  return <group ref={group} position={[-1.35, .72, .45]} rotation={[.25, .45, -.2]} scale={[.52, .52, .52]} onClick={(e) => { e.stopPropagation(); beginRoll(); }} onPointerOver={() => { if (!disabled && !rolling) gl.domElement.style.cursor = "pointer"; }} onPointerOut={() => { gl.domElement.style.cursor = "default"; }}>
    <RoundedBox args={[1.28, 1.28, 1.28]} radius={.16} smoothness={6} castShadow receiveShadow><meshPhysicalMaterial color="#bd8733" roughness={.25} metalness={.68} clearcoat={.35} clearcoatRoughness={.22} /></RoundedBox>
    <FacePips face="+y" value={1} /><FacePips face="-y" value={6} /><FacePips face="+x" value={3} /><FacePips face="-x" value={4} /><FacePips face="+z" value={2} /><FacePips face="-z" value={5} />
  </group>;
}

function ResultFace({ value }: { value: number }) {
  return <div className={styles.flatDieFace} aria-label={`Rolled ${value}`}>{PIP_LAYOUTS[value].map(([x, y], i) => <span key={i} className={styles.flatPip} style={{ left: `${50 + x * 68}%`, top: `${50 - y * 68}%` }} />)}</div>;
}

export function DiceResultIcon({ value }: { value: number }) {
  return <div className={styles.persistentResult} aria-label={`Last roll ${value}`}><ResultFace value={value} /></div>;
}

export default function Dice3D({ disabled = false, onResult }: Dice3DProps) {
  const [rolling, setRolling] = useState(false);
  const [visibleResult, setVisibleResult] = useState<number | null>(null);
  const [flying, setFlying] = useState(false);
  const [trigger, setTrigger] = useState(0);

  return <div className={`${styles.root} ${rolling ? styles.rolling : ""}`}>
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 3.5, 8.5], fov: 39 }} gl={{ antialias: true, alpha: true }}>
      <CameraRig /><ambientLight intensity={.9} /><directionalLight position={[-4, 7, 5]} intensity={3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} /><pointLight position={[3, 3, 4]} intensity={13} color="#e0ac55" distance={10} />
      <BrassDie disabled={disabled} onResult={onResult} rolling={rolling} setRolling={setRolling} setVisibleResult={setVisibleResult} setFlying={setFlying} trigger={trigger} />
      <ContactShadows position={[0, .035, 0]} opacity={.46} scale={8} blur={2.5} far={5} />
    </Canvas>
    {visibleResult !== null && <div className={`${styles.flyawayDie} ${flying ? styles.flyawayActive : ""}`}><ResultFace value={visibleResult} /></div>}
    <div className={styles.instruction} aria-live="polite"><b>{rolling ? (visibleResult ? `You rolled ${visibleResult}` : "Rolling…") : "Tap the brass die"}</b><span>{rolling ? "The rolled face is presented to you" : "Roll 1–6 spaces"}</span></div>
    <button type="button" disabled={disabled || rolling} onClick={() => setTrigger((v) => v + 1)} style={{ position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)", zIndex: 120, minWidth: 118, padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(224,177,83,.75)", background: "rgba(20,26,22,.96)", color: "#f0d18d", fontFamily: "Georgia,serif", fontWeight: 700, letterSpacing: ".08em", cursor: disabled || rolling ? "default" : "pointer" }}>{rolling ? "ROLLING…" : "ROLL DIE"}</button>
  </div>;
}
