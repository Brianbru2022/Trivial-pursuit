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

const BY_ID = Object.fromEntries(LOCATIONS.map((location) => [location.id, location])) as Record<string, Location>;
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

export default function Discovery3DStyled() {
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
        <div><small>3D MODEL STUDY</small><h1>DISCOVERY LEGENDS</h1></div>
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
          <ambientLight intensity={1.15} />
          <hemisphereLight args={["#dceeff", "#4b3a25", 1.25]} />
          <directionalLight castShadow position={[-8, 14, 10]} intensity={3.5} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <Board reachable={reachable} selected={selected} onSelect={visit} />
          {players.map((p, i) => (
            <ExplorerPiece key={p.colour} colour={p.colour} route={routes[i] || [p.location]} lane={i} active={i === active} />
          ))}
          <ContactShadows position={[0, -0.02, 0]} opacity={0.4} scale={25} blur={2.6} far={10} />
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
      <mesh receiveShadow position={[0, -0.48, 0]}>
        <boxGeometry args={[20, 0.8, 14]} />
        <meshStandardMaterial color="#352419" roughness={0.9} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[19.5, 13.5]} />
        <meshPhysicalMaterial color="#14798d" roughness={0.2} clearcoat={0.55} clearcoatRoughness={0.18} />
      </mesh>
      {EDGES.map(([a, b]) => <Bridge key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} />)}
      {LOCATIONS.map((location) => (
        <Island key={location.id} location={location} selected={selected === location.id} reachable={reachable.includes(location.id)} onClick={() => onSelect(location.id)} />
      ))}
    </group>
  );
}

function Bridge({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const curve = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const mid = A.clone().lerp(B, 0.5);
    const dir = B.clone().sub(A);
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.16);
    mid.add(perp);
    A.y = 0.16;
    B.y = 0.16;
    mid.y = 0.16;
    return new THREE.CatmullRomCurve3([A, mid, B]);
  }, [a, b]);
  const points = useMemo(() => curve.getSpacedPoints(8), [curve]);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[curve, 24, 0.12, 8, false]} />
        <meshStandardMaterial color="#7d6a4d" roughness={0.96} />
      </mesh>
      {points.map((p, i) => {
        const tangent = curve.getTangent(i / Math.max(1, points.length - 1));
        const angle = Math.atan2(tangent.z, tangent.x);
        return (
          <mesh key={i} castShadow receiveShadow position={[p.x, p.y + 0.07, p.z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.34, 0.08, 0.58]} />
            <meshStandardMaterial color={i % 2 ? "#c5b48e" : "#d6c6a3"} roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

function Island({ location, selected, reachable, onClick }: { location: Location; selected: boolean; reachable: boolean; onClick: () => void }) {
  const palette = biomePalette(location.kind);
  return (
    <group position={location.position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh castShadow receiveShadow position={[0, -0.28, 0]} scale={[1.15, 0.46, 0.92]} rotation={[0, 0.14, 0]}>
        <cylinderGeometry args={[1, 1.16, 1, 12]} />
        <meshStandardMaterial color={palette.rim} roughness={1} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.08, -0.01, 0.04]} scale={[1.08, 0.24, 0.85]} rotation={[0, -0.09, 0]}>
        <cylinderGeometry args={[1, 1.04, 1, 11]} />
        <meshStandardMaterial color={palette.ground} roughness={0.96} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.14, 0.13, -0.08]} scale={[0.72, 0.15, 0.56]} rotation={[0, 0.18, 0]}>
        <cylinderGeometry args={[1, 1.02, 1, 9]} />
        <meshStandardMaterial color={palette.high} roughness={0.95} />
      </mesh>
      {reachable && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
          <ringGeometry args={[0.9, 1.14, 40]} />
          <meshBasicMaterial color="#79ffb0" transparent opacity={0.92} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <ringGeometry args={[1.15, 1.26, 40]} />
          <meshBasicMaterial color="#f5cf69" />
        </mesh>
      )}
      <LocationModel kind={location.kind} />
    </group>
  );
}

function biomePalette(kind: Kind) {
  if (kind === "frozen") return { rim: "#64717a", ground: "#dce8e7", high: "#f3f7f5" };
  if (kind === "oasis") return { rim: "#80643a", ground: "#d8ba65", high: "#efd88e" };
  if (kind === "volcano") return { rim: "#3c2924", ground: "#74453a", high: "#9a5945" };
  if (kind === "pirate" || kind === "port") return { rim: "#554633", ground: "#748c5b", high: "#96a86c" };
  if (kind === "city" || kind === "monument") return { rim: "#665335", ground: "#8ea35f", high: "#a9ba78" };
  return { rim: "#4d3d28", ground: "#739356", high: "#91aa68" };
}

function LocationModel({ kind }: { kind: Kind }) {
  if (kind === "camp") return <CampModel />;
  if (kind === "haven") return <HavenModel />;
  if (kind === "frozen") return <FrozenModel />;
  if (kind === "ruins") return <RuinsModel overgrown />;
  if (kind === "oasis") return <OasisModel />;
  if (kind === "temple") return <TempleModel />;
  if (kind === "forest") return <ForestModel />;
  if (kind === "city") return <GoldenCityModel />;
  if (kind === "volcano") return <VolcanoModel />;
  if (kind === "pirate") return <PirateModel />;
  if (kind === "port") return <PortModel />;
  return <MonumentModel />;
}

function CampModel() {
  return <group><Tent position={[-0.34, 0.38, 0.12]} colour="#d8c087" /><Tent position={[0.35, 0.32, -0.2]} colour="#bd8d61" /><mesh castShadow position={[0.03, 0.32, 0.44]}><cylinderGeometry args={[0.12, 0.16, 0.12, 12]} /><meshStandardMaterial color="#4d2d1e" /></mesh><pointLight position={[0.03, 0.46, 0.44]} intensity={0.8} color="#ffad4f" distance={2.2} /></group>;
}
function Tent({ position, colour }: { position: [number, number, number]; colour: string }) {
  return <mesh castShadow position={position} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.42, 0.68, 4]} /><meshStandardMaterial color={colour} roughness={0.9} /></mesh>;
}
function HavenModel() {
  return <group><mesh castShadow position={[0, 0.55, 0]}><boxGeometry args={[0.9, 0.55, 0.6]} /><meshStandardMaterial color="#a57048" /></mesh><mesh castShadow position={[0, 0.95, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.7, 0.48, 4]} /><meshStandardMaterial color="#6d4431" /></mesh><mesh castShadow position={[0.62, 0.62, 0.18]}><cylinderGeometry args={[0.08, 0.11, 0.9, 10]} /><meshStandardMaterial color="#d9d1ba" /></mesh></group>;
}
function FrozenModel() {
  return <group>{[[-0.52, 0.52, 0.1], [0.05, 0.66, -0.16], [0.58, 0.44, 0.16]].map((p, i) => <group key={i} position={p as [number, number, number]}><mesh castShadow><coneGeometry args={[0.42 - i * 0.03, 1.1 - i * 0.08, 6]} /><meshStandardMaterial color={i === 1 ? "#eef5f3" : "#cfdddf"} /></mesh><mesh castShadow position={[0, 0.28, 0]}><coneGeometry args={[0.24, 0.5, 6]} /><meshStandardMaterial color="#ffffff" /></mesh></group>)}</group>;
}
function RuinsModel({ overgrown = false }: { overgrown?: boolean }) {
  return <group>{[-0.48, -0.15, 0.22, 0.55].map((x, i) => <group key={i} position={[x, 0.34, i % 2 ? -0.12 : 0.08]}><mesh castShadow><cylinderGeometry args={[0.09, 0.12, 0.76 - (i % 2) * 0.16, 10]} /><meshStandardMaterial color="#d2c69d" /></mesh><mesh castShadow position={[0, 0.43 - (i % 2) * 0.08, 0]}><boxGeometry args={[0.23, 0.08, 0.23]} /><meshStandardMaterial color="#e1d6ad" /></mesh></group>)}<mesh castShadow position={[0.02, 0.78, -0.02]} rotation={[0, 0.08, 0]}><boxGeometry args={[1.28, 0.12, 0.26]} /><meshStandardMaterial color="#b6aa82" /></mesh>{overgrown && <Pine position={[-0.72, 0.08, 0.38]} scale={0.7} />}</group>;
}
function OasisModel() {
  return <group><mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.42, 28]} /><meshPhysicalMaterial color="#2f99aa" roughness={0.16} clearcoat={0.65} /></mesh><Palm position={[-0.52, 0.08, 0.12]} scale={0.88} /><Palm position={[0.5, 0.08, -0.08]} scale={0.8} /><Tent position={[0.12, 0.36, 0.5]} colour="#e0c36e" /></group>;
}
function TempleModel() {
  return <group><mesh castShadow position={[0, 0.32, 0]}><boxGeometry args={[1.0, 0.24, 0.72]} /><meshStandardMaterial color="#a99d72" /></mesh><mesh castShadow position={[0, 0.54, 0]}><boxGeometry args={[0.76, 0.22, 0.56]} /><meshStandardMaterial color="#c0b387" /></mesh><mesh castShadow position={[0, 0.76, 0]}><boxGeometry args={[0.5, 0.2, 0.38]} /><meshStandardMaterial color="#d1c49a" /></mesh><mesh position={[0, 0.77, 0.2]}><boxGeometry args={[0.16, 0.18, 0.08]} /><meshStandardMaterial color="#554a39" /></mesh></group>;
}
function ForestModel() {
  return <group>{[[-0.55, 0.08, -0.15], [0.0, 0.08, 0.2], [0.5, 0.08, -0.1], [-0.1, 0.08, -0.42]].map((p, i) => <Pine key={i} position={p as [number, number, number]} scale={0.78 + i * 0.05} />)}<mesh castShadow position={[0.15, 0.28, 0.5]}><dodecahedronGeometry args={[0.22, 0]} /><meshStandardMaterial emissive="#5fbf87" emissiveIntensity={0.6} color="#497f61" /></mesh></group>;
}
function GoldenCityModel() {
  return <group>{[-0.48, 0, 0.48].map((x, i) => <group key={i} position={[x, 0.3, i === 1 ? -0.12 : 0.1]}><mesh castShadow position={[0, 0.24, 0]}><boxGeometry args={[0.46, 0.52 + i * 0.08, 0.46]} /><meshStandardMaterial color={i === 1 ? "#d3a64b" : "#be9140"} metalness={0.18} /></mesh><mesh castShadow position={[0, 0.56 + i * 0.04, 0]}><sphereGeometry args={[0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e2b64b" metalness={0.25} /></mesh></group>)}</group>;
}
function VolcanoModel() {
  return <group><mesh castShadow position={[0, 0.48, 0]}><coneGeometry args={[0.68, 1.25, 9]} /><meshStandardMaterial color="#55342e" /></mesh><mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.2, 0.3, 0.08, 18]} /><meshBasicMaterial color="#ff6f32" /></mesh><pointLight position={[0, 1.1, 0]} intensity={1.1} color="#ff6f32" distance={2.2} /></group>;
}
function PirateModel() {
  return <group><mesh castShadow position={[-0.18, 0.42, 0]}><boxGeometry args={[0.8, 0.5, 0.62]} /><meshStandardMaterial color="#76523a" /></mesh><mesh castShadow position={[0.16, 0.62, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.56, 0.38, 4]} /><meshStandardMaterial color="#4b3429" /></mesh><mesh castShadow position={[0.55, 0.28, 0.36]}><boxGeometry args={[0.72, 0.08, 0.22]} /><meshStandardMaterial color="#a47b4f" /></mesh></group>;
}
function PortModel() {
  return <group><mesh castShadow position={[-0.32, 0.38, 0]}><boxGeometry args={[0.54, 0.5, 0.48]} /><meshStandardMaterial color="#ad754b" /></mesh><mesh castShadow position={[0.28, 0.34, -0.05]}><boxGeometry args={[0.48, 0.42, 0.42]} /><meshStandardMaterial color="#c28a58" /></mesh><mesh castShadow position={[0.62, 0.21, 0.38]}><boxGeometry args={[0.9, 0.08, 0.24]} /><meshStandardMaterial color="#95704a" /></mesh><mesh castShadow position={[0.82, 0.4, 0.38]}><cylinderGeometry args={[0.025, 0.035, 0.75, 8]} /><meshStandardMaterial color="#5d4a36" /></mesh></group>;
}
function MonumentModel() {
  return <group><mesh castShadow position={[0, 0.32, 0]}><cylinderGeometry args={[0.64, 0.76, 0.22, 20]} /><meshStandardMaterial color="#c6ab6a" /></mesh><mesh castShadow position={[0, 0.6, 0]}><cylinderGeometry args={[0.25, 0.32, 0.9, 16]} /><meshStandardMaterial color="#e1c67e" /></mesh><mesh castShadow position={[0, 1.13, 0]}><octahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color="#f0d389" metalness={0.15} /></mesh></group>;
}
function Palm({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}><mesh castShadow position={[0, 0.34, 0]}><cylinderGeometry args={[0.05, 0.08, 0.68, 8]} /><meshStandardMaterial color="#75502e" /></mesh>{[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rotation, i) => <mesh key={i} castShadow position={[0, 0.72, 0]} rotation={[0, rotation, -0.55]}><coneGeometry args={[0.12, 0.58, 5]} /><meshStandardMaterial color="#3f7744" /></mesh>)}</group>;
}
function Pine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}><mesh castShadow position={[0, 0.25, 0]}><cylinderGeometry args={[0.045, 0.07, 0.5, 8]} /><meshStandardMaterial color="#5a432a" /></mesh><mesh castShadow position={[0, 0.62, 0]}><coneGeometry args={[0.24, 0.64, 7]} /><meshStandardMaterial color="#2e6547" /></mesh><mesh castShadow position={[0, 0.86, 0]}><coneGeometry args={[0.17, 0.4, 7]} /><meshStandardMaterial color="#397556" /></mesh></group>;
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
      <mesh castShadow position={[0, 0.01, 0]}><cylinderGeometry args={[active ? 0.31 : 0.27, active ? 0.35 : 0.31, 0.12, 24]} /><meshStandardMaterial color={active ? "#f0cd66" : "#bd9d66"} metalness={0.25} /></mesh>
      <mesh castShadow position={[0, 0.17, 0]}><cylinderGeometry args={[0.2, 0.22, 0.12, 20]} /><meshStandardMaterial color={COLOUR[colour]} /></mesh>
      <mesh castShadow position={[0, 0.45, 0]}><capsuleGeometry args={[0.14, 0.34, 6, 10]} /><meshStandardMaterial color={COLOUR[colour]} roughness={0.55} /></mesh>
      <mesh castShadow position={[0, 0.72, 0]}><sphereGeometry args={[0.145, 16, 10]} /><meshStandardMaterial color="#ddb78f" /></mesh>
      <mesh castShadow position={[0, 0.84, 0]}><cylinderGeometry args={[0.22, 0.18, 0.07, 18]} /><meshStandardMaterial color="#493725" /></mesh>
      <mesh castShadow position={[0.16, 0.43, -0.03]} rotation={[0, 0, -0.35]}><boxGeometry args={[0.1, 0.36, 0.16]} /><meshStandardMaterial color="#6c4a31" /></mesh>
    </group>
  );
}
