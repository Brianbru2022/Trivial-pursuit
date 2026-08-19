"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Dice3D, { DiceResultIcon } from "./Dice3D";
import styles from "./Discovery3DStable.module.css";

type Colour = "red" | "blue" | "green" | "amber";
type Kind = "camp" | "frozen" | "ruins" | "oasis" | "temple" | "haven" | "forest" | "city" | "volcano" | "pirate" | "port" | "monument";
type Location = { id: string; name: string; kind: Kind; position: [number, number, number] };
type Explorer = { name: string; colour: Colour; location: string };

const COLOUR: Record<Colour, string> = {
  red: "#c74336",
  blue: "#3476d1",
  green: "#56a05a",
  amber: "#d79a35",
};

const LOCATIONS: Location[] = [
  { id: "camp", name: "Expedition Camp", kind: "camp", position: [-7, 0, 3.7] },
  { id: "haven", name: "Cliff Haven", kind: "haven", position: [-6.4, 0, 0.2] },
  { id: "frozen", name: "Frozen Wastes", kind: "frozen", position: [-5.1, 0, -3.2] },
  { id: "ruins", name: "Ancient Ruins", kind: "ruins", position: [-2.2, 0, -4.0] },
  { id: "oasis", name: "Desert Oasis", kind: "oasis", position: [1.1, 0, -3.7] },
  { id: "temple", name: "Lost Temple", kind: "temple", position: [4.6, 0, -2.8] },
  { id: "forest", name: "Enchanted Forest", kind: "forest", position: [-1.1, 0, -0.3] },
  { id: "city", name: "Golden City", kind: "city", position: [3.0, 0, -0.1] },
  { id: "volcano", name: "Volcanic Isle", kind: "volcano", position: [5.0, 0, 3.0] },
  { id: "pirate", name: "Pirate Cove", kind: "pirate", position: [-4.2, 0, 3.8] },
  { id: "port", name: "Merchant Port", kind: "port", position: [-0.2, 0, 4.1] },
  { id: "monument", name: "The Great Monument", kind: "monument", position: [3.8, 0, 4.2] },
];

const BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<string, Location>;

const EDGES: [string, string][] = [
  ["camp", "haven"], ["camp", "pirate"], ["haven", "frozen"], ["haven", "forest"],
  ["frozen", "ruins"], ["ruins", "forest"], ["ruins", "oasis"], ["oasis", "temple"],
  ["oasis", "city"], ["forest", "city"], ["forest", "pirate"], ["forest", "port"],
  ["city", "temple"], ["city", "volcano"], ["city", "monument"], ["pirate", "port"],
  ["port", "monument"], ["volcano", "monument"], ["temple", "volcano"],
];

const ADJ: Record<string, string[]> = {};
for (const location of LOCATIONS) ADJ[location.id] = [];
for (const [a, b] of EDGES) {
  ADJ[a].push(b);
  ADJ[b].push(a);
}

function reachableWithin(start: string, steps: number) {
  const dist: Record<string, number> = { [start]: 0 };
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of ADJ[current]) {
      if (dist[next] === undefined) {
        dist[next] = dist[current] + 1;
        queue.push(next);
      }
    }
  }
  return Object.keys(dist).filter((id) => id !== start && dist[id] <= steps);
}

function shortestPath(start: string, end: string) {
  const previous: Record<string, string | undefined> = { [start]: undefined };
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === end) break;
    for (const next of ADJ[current]) {
      if (!(next in previous)) {
        previous[next] = current;
        queue.push(next);
      }
    }
  }
  if (!(end in previous)) return [start];
  const path = [end];
  let cursor = previous[end];
  while (cursor) {
    path.push(cursor);
    cursor = previous[cursor];
  }
  return path.reverse();
}

export default function Discovery3DStable() {
  const [players, setPlayers] = useState<Explorer[]>([
    { name: "Red Explorer", colour: "red", location: "camp" },
    { name: "Blue Explorer", colour: "blue", location: "camp" },
    { name: "Green Explorer", colour: "green", location: "camp" },
    { name: "Amber Explorer", colour: "amber", location: "camp" },
  ]);
  const [active, setActive] = useState(0);
  const [roll, setRoll] = useState<number | null>(null);
  const [reachable, setReachable] = useState<string[]>([]);
  const [selected, setSelected] = useState("camp");
  const [routes, setRoutes] = useState<Record<number, string[]>>({ 0: ["camp"], 1: ["camp"], 2: ["camp"], 3: ["camp"] });
  const [message, setMessage] = useState("Roll the die.");
  const [moving, setMoving] = useState(false);

  const player = players[active];

  function applyRoll(value: number) {
    if (moving) return;
    setRoll(value);
    setReachable(reachableWithin(player.location, value));
    setMessage(`Rolled ${value}. Choose a highlighted island.`);
  }

  function visit(id: string) {
    if (!reachable.includes(id) || moving) return;
    const path = shortestPath(player.location, id);
    setRoutes((current) => ({ ...current, [active]: path }));
    setSelected(id);
    setReachable([]);
    setMoving(true);
    setMessage(`Travelling to ${BY_ID[id].name}...`);
    window.setTimeout(() => {
      setPlayers((current) => current.map((p, i) => (i === active ? { ...p, location: id } : p)));
      setMoving(false);
      setMessage(`Arrived at ${BY_ID[id].name}. End turn when ready.`);
    }, Math.max(900, (path.length - 1) * 550));
  }

  function endTurn() {
    if (moving) return;
    const next = (active + 1) % players.length;
    setActive(next);
    setRoll(null);
    setReachable([]);
    setSelected(players[next].location);
    setMessage(`${players[next].name}: roll the die.`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><small>STABLE 3D BOARD TEST</small><h1>DISCOVERY LEGENDS</h1></div>
        <div className={styles.players}>
          {players.map((p, i) => (
            <button key={p.colour} className={i === active ? styles.active : ""} onClick={() => {
              if (!moving) {
                setActive(i);
                setSelected(p.location);
              }
            }}>
              <i style={{ background: COLOUR[p.colour] }} />{p.name}
            </button>
          ))}
        </div>
      </header>

      <section className={styles.stage}>
        <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [17, 15, 17], zoom: 37, near: 0.1, far: 100 }}>
          <FixedCamera />
          <color attach="background" args={["#0f2730"]} />
          <ambientLight intensity={1.05} />
          <hemisphereLight args={["#e0f2ff", "#4a3927", 1.25]} />
          <directionalLight castShadow position={[-8, 14, 10]} intensity={3.5} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <Board reachable={reachable} selected={selected} onSelect={visit} />
          {players.map((p, i) => (
            <ExplorerPiece key={p.colour} colour={p.colour} route={routes[i] || [p.location]} lane={i} active={i === active} />
          ))}
          <ContactShadows position={[0, -0.02, 0]} opacity={0.42} scale={25} blur={2.8} far={10} />
        </Canvas>

        {roll !== null && <DiceResultIcon value={roll} />}
        <aside className={styles.info}>
          <small>DESTINATION</small>
          <strong>{BY_ID[selected].name}</strong>
          <span>{message}</span>
        </aside>
        <div className={styles.dice}><Dice3D onResult={applyRoll} /></div>
        <button className={styles.endTurn} onClick={endTurn} disabled={moving}>END TURN</button>
      </section>
    </main>
  );
}

function FixedCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(17, 15, 17);
    camera.lookAt(0, 0, 0);
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 37;
    ortho.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Board({ reachable, selected, onSelect }: { reachable: string[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[20.4, 0.82, 14.4]} />
        <meshStandardMaterial color="#332216" roughness={0.9} />
      </mesh>
      <WaterSurface />
      {EDGES.map(([a, b], index) => <Pathway key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} index={index} />)}
      {LOCATIONS.map((location) => (
        <Island key={location.id} location={location} selected={selected === location.id} reachable={reachable.includes(location.id)} onClick={() => onSelect(location.id)} />
      ))}
    </group>
  );
}

function WaterSurface() {
  const top = useRef<THREE.Mesh>(null);
  const glints = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (top.current) {
      top.current.position.y = -0.04 + Math.sin(clock.elapsedTime * 0.55) * 0.01;
      top.current.rotation.z = Math.sin(clock.elapsedTime * 0.13) * 0.003;
    }
    if (glints.current) glints.current.position.x = Math.sin(clock.elapsedTime * 0.18) * 0.18;
  });
  const streaks: [number, number, number, number][] = [
    [-7.5, -2.1, 1.1, 0.03], [-4.0, 2.5, 1.4, 0.035], [-0.6, -1.8, 1.0, 0.025],
    [2.1, 2.8, 1.2, 0.03], [5.8, -1.0, 1.45, 0.035], [7.2, 2.0, 0.9, 0.025],
  ];
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
        <planeGeometry args={[19.8, 13.8]} />
        <meshPhysicalMaterial color="#0d536b" roughness={0.34} metalness={0.06} clearcoat={0.34} />
      </mesh>
      <mesh ref={top} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[19.65, 13.65, 24, 18]} />
        <meshPhysicalMaterial color="#167d93" roughness={0.2} metalness={0.1} clearcoat={0.72} clearcoatRoughness={0.16} transparent opacity={0.9} />
      </mesh>
      <group ref={glints}>
        {streaks.map(([x, z, width, height], i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, i * 0.45]} position={[x, -0.025, z]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color="#9ddce0" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Pathway({ a, b, index }: { a: [number, number, number]; b: [number, number, number]; index: number }) {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const mid = A.clone().lerp(B, 0.5);
    const dir = B.clone().sub(A);
    const bend = index % 2 === 0 ? 0.24 : -0.24;
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(bend);
    A.y = 0.15;
    B.y = 0.15;
    mid.add(perp);
    mid.y = 0.15;
    return new THREE.CatmullRomCurve3([A, mid, B]);
  }, [a, b, index]);
  const points = useMemo(() => curve.getSpacedPoints(10), [curve]);
  const wooden = index % 4 === 0 || index % 4 === 3;
  return (
    <group>
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[curve, 30, wooden ? 0.11 : 0.14, 8, false]} />
        <meshStandardMaterial color={wooden ? "#6f4d2f" : "#7f735d"} roughness={0.96} />
      </mesh>
      {points.map((point, i) => {
        const tangent = curve.getTangent(i / Math.max(1, points.length - 1));
        const angle = Math.atan2(tangent.z, tangent.x);
        return (
          <mesh key={i} castShadow receiveShadow position={[point.x, point.y + 0.08, point.z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[wooden ? 0.34 : 0.4, 0.1, wooden ? 0.68 : 0.58]} />
            <meshStandardMaterial color={wooden ? (i % 2 ? "#a27b4f" : "#8e6842") : (i % 2 ? "#cbbd9c" : "#b5a789")} roughness={0.94} />
          </mesh>
        );
      })}
    </group>
  );
}

function terrainPalette(kind: Kind) {
  if (kind === "frozen") return { top: "#dfe9e8", top2: "#f2f5f2", rock: "#667176", shore: "#aebfc2" };
  if (kind === "oasis") return { top: "#d4b35e", top2: "#ead488", rock: "#755d35", shore: "#d7c07d" };
  if (kind === "volcano") return { top: "#684336", top2: "#8b5540", rock: "#342a26", shore: "#4c3730" };
  if (kind === "city" || kind === "monument") return { top: "#879d5d", top2: "#a1b66f", rock: "#554a31", shore: "#8a8055" };
  if (kind === "pirate" || kind === "port" || kind === "haven") return { top: "#6f8c54", top2: "#8ca968", rock: "#4c402c", shore: "#907d55" };
  if (kind === "forest") return { top: "#55784d", top2: "#6d945d", rock: "#3f452d", shore: "#65704a" };
  return { top: "#718f57", top2: "#8cab69", rock: "#4b3d29", shore: "#80704d" };
}

function islandShape(id: string) {
  const seed = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const wobble = (n: number) => ((seed * (n * 17 + 11)) % 23) / 100;
  return [
    { x: -0.18 + wobble(1), z: 0.06 - wobble(2), sx: 1.15 + wobble(3), sz: 0.88 + wobble(4) },
    { x: 0.32 - wobble(5), z: -0.16 + wobble(6), sx: 0.82 + wobble(7), sz: 0.74 + wobble(8) },
    { x: -0.42 + wobble(9), z: -0.24 + wobble(10), sx: 0.68 + wobble(11), sz: 0.64 + wobble(12) },
  ];
}

function Island({ location, selected, reachable, onClick }: { location: Location; selected: boolean; reachable: boolean; onClick: () => void }) {
  const palette = terrainPalette(location.kind);
  const blobs = islandShape(location.id);
  return (
    <group position={location.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {blobs.map((blob, i) => (
        <group key={i} position={[blob.x, 0, blob.z]}>
          <mesh castShadow receiveShadow position={[0, -0.32 - i * 0.015, 0]} scale={[blob.sx * 1.1, 0.46, blob.sz * 1.1]}>
            <cylinderGeometry args={[1, 1.18, 1, 12]} />
            <meshStandardMaterial color={palette.rock} roughness={1} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, -0.08 + i * 0.015, 0]} scale={[blob.sx, 0.26 + i * 0.025, blob.sz]}>
            <cylinderGeometry args={[1, 1.05, 1, 12]} />
            <meshStandardMaterial color={i === 1 ? palette.top2 : palette.top} roughness={0.96} />
          </mesh>
        </group>
      ))}
      {reachable && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
          <ringGeometry args={[1.08, 1.3, 40]} />
          <meshBasicMaterial color="#79ffb0" transparent opacity={0.95} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[1.31, 1.39, 40]} />
          <meshBasicMaterial color="#f5cf69" />
        </mesh>
      )}
      <Model kind={location.kind} />
    </group>
  );
}

function Model({ kind }: { kind: Kind }) {
  if (kind === "frozen") {
    return <group>{[-0.38, 0.08, 0.62].map((x, i) => <mesh key={i} castShadow position={[x, 0.5, (i - 1) * 0.12]}><coneGeometry args={[0.34, 1.1, 6]} /><meshStandardMaterial color={i === 1 ? "#ffffff" : "#dce7e7"} /></mesh>)}</group>;
  }
  if (kind === "ruins" || kind === "temple") {
    return <group>{[-0.42, 0, 0.42].map((x, i) => <mesh key={i} castShadow position={[x, 0.48, 0]}><cylinderGeometry args={[0.09, 0.12, 0.94, 10]} /><meshStandardMaterial color="#d1c49b" /></mesh>)}<mesh castShadow position={[0, 0.94, 0]}><boxGeometry args={[1.12, 0.12, 0.25]} /><meshStandardMaterial color="#b9aa81" /></mesh></group>;
  }
  if (kind === "oasis") {
    return <group><mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.42, 24]} /><meshPhysicalMaterial color="#2c91a1" clearcoat={0.5} /></mesh><mesh castShadow position={[-0.48, 0.45, 0]}><cylinderGeometry args={[0.05, 0.08, 0.8, 8]} /><meshStandardMaterial color="#76522e" /></mesh></group>;
  }
  if (kind === "volcano") {
    return <group><mesh castShadow position={[0, 0.48, 0]}><coneGeometry args={[0.58, 1.2, 8]} /><meshStandardMaterial color="#623c31" /></mesh><mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.16, 0.22, 0.05, 16]} /><meshBasicMaterial color="#ff6a32" /></mesh></group>;
  }
  if (kind === "city" || kind === "monument") {
    return <group>{[-0.4, 0, 0.4].map((x, i) => <mesh key={i} castShadow position={[x, 0.42, 0]}><boxGeometry args={[0.42, 0.72, 0.42]} /><meshStandardMaterial color="#c59b45" /></mesh>)}<mesh castShadow position={[0, 0.9, 0]}><sphereGeometry args={[0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ddb44b" /></mesh></group>;
  }
  if (kind === "forest") {
    return <group>{[-0.48, 0, 0.48].map((x, i) => <mesh key={i} castShadow position={[x, 0.58, (i - 1) * 0.08]}><coneGeometry args={[0.28, 0.86, 7]} /><meshStandardMaterial color={i === 1 ? "#285c3f" : "#356f4d"} /></mesh>)}</group>;
  }
  return <mesh castShadow position={[0, 0.42, 0]}><boxGeometry args={[0.78, 0.62, 0.62]} /><meshStandardMaterial color="#a36f45" /></mesh>;
}

function ExplorerPiece({ colour, route, lane, active }: { colour: Colour; route: string[]; lane: number; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const segment = useRef(0);
  useEffect(() => { segment.current = 0; }, [route]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const index = Math.min(segment.current, route.length - 1);
    const next = Math.min(index + 1, route.length - 1);
    const p = BY_ID[route[next]].position;
    const target = new THREE.Vector3(p[0] + (lane - 1.5) * 0.2, 0.68, p[2] + (lane % 2 ? 0.16 : -0.16));
    ref.current.position.lerp(target, 1 - Math.pow(0.002, delta));
    if (ref.current.position.distanceTo(target) < 0.06 && next > index) segment.current = next;
  });
  const start = BY_ID[route[0]].position;
  return (
    <group ref={ref} position={[start[0] + (lane - 1.5) * 0.2, 0.68, start[2] + (lane % 2 ? 0.16 : -0.16)]}>
      <mesh castShadow><cylinderGeometry args={[active ? 0.3 : 0.26, active ? 0.34 : 0.3, 0.12, 24]} /><meshStandardMaterial color={active ? "#f0cd66" : "#c6a76c"} /></mesh>
      <mesh castShadow position={[0, 0.38, 0]}><capsuleGeometry args={[0.15, 0.34, 5, 10]} /><meshStandardMaterial color={COLOUR[colour]} /></mesh>
      <mesh castShadow position={[0, 0.7, 0]}><sphereGeometry args={[0.15, 16, 10]} /><meshStandardMaterial color="#ddb78f" /></mesh>
    </group>
  );
}
