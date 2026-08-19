"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Dice3D from "./Dice3D";
import styles from "./AncientRuinsEncounter.module.css";

type PoiId = "gate" | "trench" | "tablet" | "sanctuary";
type NodeId = "landing" | "gate" | "ridge" | "trench" | "sanctuary" | "grove" | "tablet" | "lookout";
type Question = { prompt: string; answer: string; options: string[] };
type Poi = { id: PoiId; node: NodeId; name: string; reward: string; question: Question };
type Node = { id: NodeId; name: string; position: [number, number, number]; poi?: PoiId };
type Props = { onBack?: () => void };

type ArtTextures = { water: THREE.Texture; grass: THREE.Texture; stone: THREE.Texture; sand: THREE.Texture };

const NODES: Node[] = [
  { id: "landing", name: "Landing Beach", position: [-3.7, 0.18, 2.2] },
  { id: "gate", name: "Broken Gate", position: [-2.4, 0.18, 0.8], poi: "gate" },
  { id: "ridge", name: "Old Ridge Path", position: [-0.8, 0.2, 1.65] },
  { id: "trench", name: "Excavation Trench", position: [1.25, 0.18, 1.1], poi: "trench" },
  { id: "sanctuary", name: "Inner Sanctuary", position: [2.7, 0.2, -0.35], poi: "sanctuary" },
  { id: "grove", name: "Fig Grove", position: [1.1, 0.18, -1.9] },
  { id: "tablet", name: "Scholar's Tablet", position: [-1.2, 0.2, -1.6], poi: "tablet" },
  { id: "lookout", name: "Clifftop Lookout", position: [-3.2, 0.2, -0.45] },
];
const ORDER = NODES.map((node) => node.id);
const BY_ID = Object.fromEntries(NODES.map((node) => [node.id, node])) as Record<NodeId, Node>;
const EDGES: [NodeId, NodeId][] = ORDER.map((id, index) => [id, ORDER[(index + 1) % ORDER.length]]);

const POIS: Poi[] = [
  { id: "gate", node: "gate", name: "Broken Gate", reward: "+1 Knowledge", question: { prompt: "Which ancient civilisation built Machu Picchu?", answer: "Inca", options: ["Maya", "Inca", "Aztec", "Olmec"] } },
  { id: "trench", node: "trench", name: "Excavation Trench", reward: "+1 Relic", question: { prompt: "Archaeologists use which term for the study of layers in an excavation?", answer: "Stratigraphy", options: ["Topography", "Stratigraphy", "Cartography", "Epigraphy"] } },
  { id: "tablet", node: "tablet", name: "Scholar's Tablet", reward: "+1 Clue", question: { prompt: "The Rosetta Stone was crucial in deciphering which script?", answer: "Egyptian hieroglyphs", options: ["Linear B", "Cuneiform", "Egyptian hieroglyphs", "Phoenician"] } },
  { id: "sanctuary", node: "sanctuary", name: "Inner Sanctuary", reward: "Sun-Crowned Idol • 5 Glory", question: { prompt: "Which archaeologist is most associated with the excavation of Knossos?", answer: "Arthur Evans", options: ["Howard Carter", "Heinrich Schliemann", "Arthur Evans", "Flinders Petrie"] } },
];
const POI_BY_ID = Object.fromEntries(POIS.map((poi) => [poi.id, poi])) as Record<PoiId, Poi>;

function clockwiseRoute(start: NodeId, steps: number) {
  const startIndex = ORDER.indexOf(start);
  return Array.from({ length: steps + 1 }, (_, i) => ORDER[(startIndex + i) % ORDER.length]);
}

export default function AncientRuinsEncounter({ onBack }: Props) {
  const [position, setPosition] = useState<NodeId>("landing");
  const [route, setRoute] = useState<NodeId[]>(["landing"]);
  const [roll, setRoll] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [turnComplete, setTurnComplete] = useState(false);
  const [completed, setCompleted] = useState<PoiId[]>([]);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [knowledge, setKnowledge] = useState(0);
  const [relics, setRelics] = useState(0);
  const [clues, setClues] = useState(0);
  const [discovery, setDiscovery] = useState(false);
  const [message, setMessage] = useState("Roll the D4. Explorers move clockwise around Aster Vale.");

  const sanctuaryUnlocked = completed.filter((id) => id !== "sanctuary").length >= 2;
  const canLeave = position === "landing" && !moving && !selected;

  function applyRoll(value: number) {
    if (moving || selected || discovery || turnComplete) return;
    const path = clockwiseRoute(position, value);
    const destination = path[path.length - 1];
    setRoll(value);
    setRoute(path);
    setMoving(true);
    setMessage(`D4: ${value}. Moving clockwise to ${BY_ID[destination].name}…`);
  }

  function finishMove(id: NodeId) {
    setPosition(id);
    setMoving(false);
    const node = BY_ID[id];
    if (id === "sanctuary" && !sanctuaryUnlocked) {
      setTurnComplete(true);
      setMessage("The Inner Sanctuary is still sealed. Your turn ends here.");
      return;
    }
    if (node.poi && !completed.includes(node.poi)) {
      setSelected(POI_BY_ID[node.poi]);
      setResult(null);
      setMessage(`You reached ${node.name}. Answer correctly to earn another D4 roll.`);
      return;
    }
    setTurnComplete(true);
    setMessage(`${node.name}. No unresolved encounter here — your island turn ends.`);
  }

  function answer(option: string) {
    if (!selected || result) return;
    const correct = option === selected.question.answer;
    setResult(correct ? "correct" : "wrong");
    if (!correct) {
      setMessage("Wrong answer — your island turn ends.");
      return;
    }
    setCompleted((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    if (selected.id === "gate") setKnowledge((v) => v + 1);
    if (selected.id === "trench") setRelics((v) => v + 1);
    if (selected.id === "tablet") setClues((v) => v + 1);
    if (selected.id === "sanctuary") setDiscovery(true);
    setMessage(selected.id === "sanctuary" ? "The Sun-Crowned Idol is yours." : "Correct — reward secured. You earn another D4 roll.");
  }

  function closeQuestion() {
    if (!result) return;
    const wasCorrect = result === "correct";
    const wasSanctuary = selected?.id === "sanctuary";
    setSelected(null);
    setResult(null);
    setRoll(null);
    setRoute([position]);
    if (wasCorrect && !wasSanctuary) {
      setTurnComplete(false);
      setMessage("Bonus roll earned — roll the D4 again.");
    } else {
      setTurnComplete(true);
      setMessage(wasSanctuary ? "Legendary Discovery secured." : "Wrong answer — end the island turn.");
    }
  }

  function endIslandTurn() {
    if (moving || selected) return;
    setTurnComplete(false);
    setRoll(null);
    setRoute([position]);
    setMessage(position === "landing" ? "Landing Beach: roll the D4 to continue, or sail back to the world map." : "New island turn — roll the D4 to move clockwise.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><small>ISLAND ENCOUNTER • ANCIENT RUINS • CLOCKWISE</small><h1>The Ruins of Aster Vale</h1></div>
        <div className={styles.progress}>
          <span>Knowledge <b>{knowledge}</b></span><span>Relics <b>{relics}</b></span><span>Clues <b>{clues}</b></span><span>Sites <b>{completed.length}/4</b></span>
        </div>
        <button className={styles.back} onClick={onBack} disabled={!canLeave}>{canLeave ? "SAIL TO WORLD" : "RETURN VIA BEACH"}</button>
      </header>

      <section className={styles.stage}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8.7, 10.2], fov: 37, near: 0.1, far: 100 }}>
          <color attach="background" args={["#0b2630"]} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#d8ecff", "#3f3326", 1.2]} />
          <directionalLight castShadow position={[-6, 12, 8]} intensity={3.25} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <pointLight position={[4, 5, -2]} intensity={4.2} color="#e9bd73" distance={12} />
          <IslandBoard current={position} sanctuaryUnlocked={sanctuaryUnlocked} completed={completed} discovery={discovery} route={route} onArrive={finishMove} />
          <ContactShadows position={[0, -0.28, 0]} opacity={0.38} scale={14} blur={2.9} far={8} />
        </Canvas>

        {roll !== null && <div className={styles.rollResult}>D4 <b>{roll}</b></div>}
        <aside className={styles.objective}>
          <small>YOUR EXPEDITION</small>
          <h2>{discovery ? "Discovery secured" : sanctuaryUnlocked ? "The sanctuary is open" : "Explore Aster Vale"}</h2>
          <p>{message}</p>
        </aside>
        <div className={styles.islandDice}><Dice3D sides={4} onResult={applyRoll} disabled={moving || !!selected || discovery || turnComplete} /></div>

        <div className={styles.poiOverlay}>
          {NODES.map((node) => {
            const complete = node.poi ? completed.includes(node.poi) : false;
            const locked = node.id === "sanctuary" && !sanctuaryUnlocked;
            const isCurrent = node.id === position;
            return <div key={node.id} className={`${styles.poiButton} ${styles[`poi_${node.id}`] || ""} ${complete ? styles.done : ""} ${locked ? styles.locked : ""} ${isCurrent ? styles.currentPoi : ""}`}>
              <b>{locked ? `🔒 ${node.name}` : complete ? `✓ ${node.name}` : node.name}</b>
              <span>{isCurrent ? "You are here" : node.poi ? (complete ? POI_BY_ID[node.poi].reward : "Encounter site") : "Path space"}</span>
            </div>;
          })}
        </div>

        <div className={styles.islandActions}>
          {turnComplete && <button onClick={endIslandTurn}>END ISLAND TURN</button>}
          {canLeave && <button onClick={onBack}>SAIL TO WORLD MAP</button>}
        </div>

        {selected && (
          <div className={styles.modalShade}>
            <article className={styles.questionCard}>
              <small>{selected.name.toUpperCase()}</small>
              <h2>{selected.question.prompt}</h2>
              <div className={styles.answers}>
                {selected.question.options.map((option) => <button key={option} disabled={!!result} onClick={() => answer(option)} className={result && option === selected.question.answer ? styles.correctAnswer : ""}>{option}</button>)}
              </div>
              {result && <div className={result === "correct" ? styles.correct : styles.wrong}>{result === "correct" ? `Correct — ${selected.reward}${selected.id !== "sanctuary" ? " — bonus D4 roll" : ""}` : `Not quite — the answer is ${selected.question.answer}. Turn over.`}</div>}
              {result && <button className={styles.continue} onClick={closeQuestion}>{result === "correct" && selected.id !== "sanctuary" ? "TAKE BONUS ROLL" : "CONTINUE"}</button>}
            </article>
          </div>
        )}

        {discovery && <div className={styles.discoveryCard}><small>LEGENDARY DISCOVERY</small><div className={styles.idol}>☀</div><h2>Sun-Crowned Idol</h2><p>Ancient ceremonial relic • 5 Glory</p></div>}
      </section>
    </main>
  );
}

function IslandBoard({ current, sanctuaryUnlocked, completed, discovery, route, onArrive }: { current: NodeId; sanctuaryUnlocked: boolean; completed: PoiId[]; discovery: boolean; route: NodeId[]; onArrive: (id: NodeId) => void }) {
  const [waterSrc, grassSrc, stoneSrc, sandSrc] = useTexture(["/textures/aster-water.svg", "/textures/aster-grass.svg", "/textures/aster-stone.svg", "/textures/aster-sand.svg"]);
  const textures = useMemo<ArtTextures>(() => {
    const prep = (source: THREE.Texture, x: number, y: number) => {
      const t = source.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(x, y);
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    };
    return { water: prep(waterSrc, 4, 3), grass: prep(grassSrc, 3, 2), stone: prep(stoneSrc, 2, 2), sand: prep(sandSrc, 3, 2) };
  }, [waterSrc, grassSrc, stoneSrc, sandSrc]);

  return <group position={[0, -0.6, 0]} rotation={[-0.08, 0, 0]} scale={1.13}>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
      <planeGeometry args={[15.4, 10.8]} />
      <meshPhysicalMaterial map={textures.water} color="#6eaab0" roughness={0.16} clearcoat={0.72} clearcoatRoughness={0.12} />
    </mesh>
    <IslandMass textures={textures} />
    {EDGES.map(([a, b]) => <PathSegment key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} stone={textures.stone} />)}
    {NODES.map((node) => <PathNode key={node.id} node={node} active={current === node.id} locked={node.id === "sanctuary" && !sanctuaryUnlocked} stone={textures.stone} />)}
    <LandingBeach sand={textures.sand} />
    <BrokenGate completed={completed.includes("gate")} stone={textures.stone} />
    <ExcavationTrench completed={completed.includes("trench")} stone={textures.stone} />
    <ScholarsTablet completed={completed.includes("tablet")} stone={textures.stone} />
    <InnerSanctuary unlocked={sanctuaryUnlocked} discovered={discovery} stone={textures.stone} />
    <FigGrove />
    <Rubble position={[-3.2, 0.2, -1.8]} stone={textures.stone} /><Rubble position={[2.8, 0.2, 1.9]} stone={textures.stone} />
    <ExplorerPawn route={route} onArrive={onArrive} />
  </group>;
}

function IslandMass({ textures }: { textures: ArtTextures }) {
  return <group>
    <mesh receiveShadow position={[-0.6, -0.32, 0.12]} scale={[4.85, 0.37, 3.34]} rotation={[0, 0.08, 0]}><cylinderGeometry args={[1, 1.08, 1, 22]} /><meshStandardMaterial map={textures.sand} color="#cab878" roughness={1} /></mesh>
    <mesh receiveShadow position={[1.05, -0.29, -0.08]} scale={[3.55, 0.34, 2.75]} rotation={[0, -0.22, 0]}><cylinderGeometry args={[1, 1.07, 1, 20]} /><meshStandardMaterial map={textures.sand} color="#c4ae70" roughness={1} /></mesh>
    <mesh receiveShadow position={[-0.68, -0.05, 0.15]} scale={[4.48, 0.23, 3.0]} rotation={[0, 0.08, 0]}><cylinderGeometry args={[1, 1.02, 1, 20]} /><meshStandardMaterial map={textures.grass} color="#9aae79" roughness={0.98} /></mesh>
    <mesh receiveShadow position={[0.98, 0.0, -0.1]} scale={[3.22, 0.21, 2.48]} rotation={[0, -0.22, 0]}><cylinderGeometry args={[1, 1.02, 1, 18]} /><meshStandardMaterial map={textures.grass} color="#8fa56e" roughness={0.98} /></mesh>
    <mesh receiveShadow position={[-1.05, 0.16, -0.28]} scale={[2.85, 0.13, 1.72]} rotation={[0, 0.12, 0]}><cylinderGeometry args={[1, 1.01, 1, 16]} /><meshStandardMaterial map={textures.grass} color="#a9b982" roughness={0.97} /></mesh>
    {[-3.8,-3.35,3.4,3.85].map((x,i)=><mesh key={i} position={[x,-0.02,(i%2?1.5:-1.45)]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.32,0.5,24]} /><meshBasicMaterial color="#d7edd9" transparent opacity={0.18} /></mesh>)}
  </group>;
}

function PathSegment({ a, b, stone }: { a: [number, number, number]; b: [number, number, number]; stone: THREE.Texture }) {
  const data = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const distance = A.distanceTo(B);
    const count = Math.max(3, Math.ceil(distance / 0.43));
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      const p = A.clone().lerp(B, t);
      const angle = Math.atan2(B.z - A.z, B.x - A.x);
      return { p, angle, width: 0.32 + (i % 3) * 0.035, depth: 0.4 + (i % 2) * 0.04, rot: (i % 2 ? 0.05 : -0.04) };
    });
  }, [a, b]);
  return <group>{data.map(({ p, angle, width, depth, rot }, i) => <mesh key={i} castShadow receiveShadow position={[p.x, 0.235 + (i % 2) * 0.006, p.z]} rotation={[0, -angle + rot, 0]}><boxGeometry args={[width, 0.07, depth]} /><meshStandardMaterial map={stone} color={i % 2 ? "#c8bd96" : "#b5aa87"} roughness={0.98} /></mesh>)}</group>;
}

function PathNode({ node, active, locked, stone }: { node: Node; active: boolean; locked: boolean; stone: THREE.Texture }) {
  return <group position={node.position}><mesh castShadow receiveShadow position={[0, 0.23, 0]}><cylinderGeometry args={[0.27, 0.31, 0.1, 20]} /><meshStandardMaterial map={stone} color={locked ? "#746e64" : active ? "#d79043" : "#c7bc94"} roughness={0.92} /></mesh>{active && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}><ringGeometry args={[0.34, 0.45, 32]} /><meshBasicMaterial color="#f1c66d" transparent opacity={0.85} /></mesh>}</group>;
}

function LandingBeach({ sand }: { sand: THREE.Texture }) {
  return <group position={[-3.8, 0.05, 2.28]} rotation={[0, -0.45, 0]}><mesh receiveShadow position={[0, 0.02, 0]} scale={[1.25, 0.08, 0.75]}><cylinderGeometry args={[1, 1, 1, 18]} /><meshStandardMaterial map={sand} color="#e0ca88" roughness={1} /></mesh><mesh castShadow position={[-0.4, 0.26, 0.1]} rotation={[0, 0.25, 0]}><boxGeometry args={[0.72, 0.08, 0.22]} /><meshStandardMaterial color="#8a643e" roughness={0.95} /></mesh><mesh castShadow position={[-0.52, 0.42, 0.1]}><cylinderGeometry args={[0.025, 0.035, 0.58, 8]} /><meshStandardMaterial color="#5f452f" /></mesh><mesh position={[-0.52, 0.56, 0.1]} rotation={[0, 0, -0.18]}><planeGeometry args={[0.35, 0.22]} /><meshStandardMaterial color="#c24d3c" side={THREE.DoubleSide} /></mesh></group>;
}

function ExplorerPawn({ route, onArrive }: { route: NodeId[]; onArrive: (id: NodeId) => void }) {
  const ref = useRef<THREE.Group>(null), segment = useRef(0), arrived = useRef(false);
  useEffect(() => { segment.current = 0; arrived.current = false; const start = BY_ID[route[0]].position; if (ref.current) ref.current.position.set(start[0], 0.54, start[2]); }, [route]);
  useFrame((_, delta) => { if (!ref.current || route.length <= 1) return; const idx = Math.min(segment.current, route.length - 1), next = Math.min(idx + 1, route.length - 1), p = BY_ID[route[next]].position, target = new THREE.Vector3(p[0], 0.54, p[2]); ref.current.position.lerp(target, 1 - Math.pow(0.0015, delta)); if (ref.current.position.distanceTo(target) < 0.045) { if (next > idx) segment.current = next; if (next === route.length - 1 && !arrived.current) { arrived.current = true; ref.current.position.copy(target); onArrive(route[next]); } } });
  const start = BY_ID[route[0]].position;
  return <group ref={ref} position={[start[0], 0.54, start[2]]} scale={0.9}>
    <mesh castShadow position={[0,0.03,0]}><cylinderGeometry args={[0.31,0.34,0.1,24]} /><meshStandardMaterial color="#b89858" metalness={0.15} roughness={0.72} /></mesh>
    <mesh castShadow position={[0,0.22,0]}><boxGeometry args={[0.18,0.28,0.13]} /><meshStandardMaterial color="#7d4d32" /></mesh>
    <mesh castShadow position={[0,0.44,0]}><capsuleGeometry args={[0.145,0.32,6,10]} /><meshStandardMaterial color="#ad3f37" /></mesh>
    <mesh castShadow position={[0,0.75,0]}><sphereGeometry args={[0.145,16,12]} /><meshStandardMaterial color="#d8b08a" /></mesh>
    <mesh castShadow position={[0,0.87,0]}><cylinderGeometry args={[0.26,0.19,0.065,20]} /><meshStandardMaterial color="#493523" /></mesh>
    <mesh castShadow position={[0,0.92,0]}><cylinderGeometry args={[0.15,0.14,0.11,20]} /><meshStandardMaterial color="#5a412a" /></mesh>
    <mesh castShadow position={[-0.09,0.18,0.03]}><capsuleGeometry args={[0.045,0.2,4,8]} /><meshStandardMaterial color="#4c3c2e" /></mesh><mesh castShadow position={[0.09,0.18,0.03]}><capsuleGeometry args={[0.045,0.2,4,8]} /><meshStandardMaterial color="#4c3c2e" /></mesh>
  </group>;
}

function BrokenGate({ completed, stone }: { completed: boolean; stone: THREE.Texture }) {
  return <group position={[-2.4, 0.18, 0.8]} rotation={[0, 0.25, 0]}>
    {[-0.56,0.56].map((x,i)=><group key={i} position={[x,0,0]}><mesh castShadow position={[0,0.42,0]}><cylinderGeometry args={[0.15,0.18,0.84,10]} /><meshStandardMaterial map={stone} color="#b9ad86" roughness={0.95} /></mesh><mesh castShadow position={[0,0.88,0]}><boxGeometry args={[0.34,0.12,0.38]} /><meshStandardMaterial map={stone} color="#d1c49b" /></mesh></group>)}
    <mesh castShadow position={[-0.08, 1.02, 0]} rotation={[0,0,-0.06]}><boxGeometry args={[1.35, 0.22, 0.36]} /><meshStandardMaterial map={stone} color={completed ? "#eadb9f" : "#c8ba8d"} emissive={completed ? "#76571c" : "#000000"} emissiveIntensity={completed ? 0.55 : 0} /></mesh>
    <mesh castShadow position={[-0.9,0.16,0.15]} rotation={[0.2,0.4,0.2]}><boxGeometry args={[0.45,0.18,0.3]} /><meshStandardMaterial map={stone} color="#9f9475" /></mesh>
    {[[-0.55,0.62],[0.58,0.5]].map((p,i)=><mesh key={i} position={[p[0],p[1],0.22]} rotation={[0,0,i?0.4:-0.35]}><cylinderGeometry args={[0.025,0.035,0.7,6]} /><meshStandardMaterial color="#4f713e" /></mesh>)}
    {completed && <pointLight position={[0,1.05,0.3]} intensity={0.8} color="#ffd36a" distance={2.4} />}
  </group>;
}

function ExcavationTrench({ completed, stone }: { completed: boolean; stone: THREE.Texture }) {
  return <group position={[1.25, 0.12, 1.1]}>
    <mesh receiveShadow position={[0,-0.05,0]}><boxGeometry args={[1.45,0.16,0.92]} /><meshStandardMaterial color="#684634" roughness={1} /></mesh>
    {[-0.62,0.62].map((x)=><mesh key={x} castShadow position={[x,0.14,0]}><boxGeometry args={[0.08,0.28,1.02]} /><meshStandardMaterial color="#8b6844" /></mesh>)}
    {[-0.34,0.34].map((z)=><mesh key={z} castShadow position={[0,0.2,z]}><boxGeometry args={[1.35,0.07,0.07]} /><meshStandardMaterial color="#a1784a" /></mesh>)}
    <mesh castShadow position={[0.36,0.11,0.04]}><dodecahedronGeometry args={[0.22,0]} /><meshStandardMaterial map={stone} color="#c0b48c" /></mesh>
    <mesh castShadow position={[-0.42,0.2,-0.1]} rotation={[0.2,0.25,0]}><boxGeometry args={[0.36,0.05,0.16]} /><meshStandardMaterial color="#b58a50" /></mesh>
    {completed && <group position={[-0.05,0.24,0]}><mesh castShadow><octahedronGeometry args={[0.2,0]} /><meshStandardMaterial color="#c9a14a" metalness={0.28} emissive="#6f4f12" emissiveIntensity={0.3} /></mesh><pointLight position={[0,0.25,0]} intensity={0.7} color="#e9c361" distance={1.5} /></group>}
  </group>;
}

function ScholarsTablet({ completed, stone }: { completed: boolean; stone: THREE.Texture }) {
  return <group position={[-1.2, 0.18, -1.6]}>
    <mesh castShadow position={[0,0.15,0]}><cylinderGeometry args={[0.42,0.5,0.22,8]} /><meshStandardMaterial map={stone} color="#9f9475" /></mesh>
    <mesh castShadow position={[0,0.53,0]} rotation={[-0.08,0.2,0]}><boxGeometry args={[0.72,0.82,0.16]} /><meshStandardMaterial map={stone} color="#b9aa80" /></mesh>
    {[-0.22,-0.08,0.06,0.2].map((y,i)=><mesh key={i} position={[0,0.55+y,0.09]}><boxGeometry args={[0.42,0.028,0.014]} /><meshBasicMaterial color={completed ? "#ffd96a" : "#655844"} /></mesh>)}
    {[-0.5,0.5].map((x,i)=><mesh key={i} position={[x,0.28,0.16]} rotation={[0,0,i?0.4:-0.4]}><cylinderGeometry args={[0.03,0.04,0.55,6]} /><meshStandardMaterial color="#466b3d" /></mesh>)}
    {completed && <pointLight position={[0,0.65,0.28]} intensity={0.9} color="#ffd96a" distance={2} />}
  </group>;
}

function InnerSanctuary({ unlocked, discovered, stone }: { unlocked: boolean; discovered: boolean; stone: THREE.Texture }) {
  return <group position={[2.7, 0.16, -0.35]}>
    {[0,1,2].map((i)=><mesh key={i} castShadow position={[0,0.16+i*0.11,0.34-i*0.12]}><boxGeometry args={[1.7-i*0.18,0.14,1.12-i*0.14]} /><meshStandardMaterial map={stone} color={i%2?"#a99e7b":"#b8ac85"} /></mesh>)}
    {[-0.52,0.52].map((x)=><mesh key={x} castShadow position={[x,0.72,0]}><cylinderGeometry args={[0.11,0.14,0.95,10]} /><meshStandardMaterial map={stone} color="#c0b38a" /></mesh>)}
    <mesh castShadow position={[0,1.16,0]}><boxGeometry args={[1.3,0.18,0.72]} /><meshStandardMaterial map={stone} color="#c9bd94" /></mesh>
    <mesh castShadow position={[0,0.75,0.37]}><boxGeometry args={[0.5,0.75,0.08]} /><meshStandardMaterial color={unlocked ? "#56452f" : "#363530"} emissive={unlocked ? "#6d4f16" : "#000000"} emissiveIntensity={unlocked ? 0.45 : 0} /></mesh>
    {unlocked && <pointLight position={[0,0.9,0.5]} intensity={discovered ? 0.55 : 1.6} color="#ffd36a" distance={3.4} />}
    {discovered && <group position={[0,0.73,0.48]}><mesh castShadow><octahedronGeometry args={[0.22,0]} /><meshStandardMaterial color="#f1c95e" metalness={0.25} emissive="#7c5a16" emissiveIntensity={0.5} /></mesh><mesh castShadow position={[0,-0.18,0]}><cylinderGeometry args={[0.16,0.2,0.18,12]} /><meshStandardMaterial color="#83602b" /></mesh></group>}
  </group>;
}

function FigGrove() {
  const trees = [[-0.45,0.08,-0.15],[0.05,0.08,0.18],[0.5,0.08,-0.08],[-0.05,0.08,-0.42]] as [number,number,number][];
  return <group position={[0.9,0.1,-2.15]}>{trees.map((p,i)=><group key={i} position={p} scale={0.9+i*0.04}><mesh castShadow position={[0,0.35,0]}><cylinderGeometry args={[0.05,0.08,0.7,8]} /><meshStandardMaterial color="#6e4b2d" /></mesh><mesh castShadow position={[-0.08,0.74,0]}><sphereGeometry args={[0.28,10,8]} /><meshStandardMaterial color="#3f7245" roughness={0.92} /></mesh><mesh castShadow position={[0.16,0.7,0.04]}><sphereGeometry args={[0.24,10,8]} /><meshStandardMaterial color="#4e8150" roughness={0.92} /></mesh>{i%2===0&&<mesh position={[0.08,0.7,0.22]}><sphereGeometry args={[0.045,8,6]} /><meshStandardMaterial color="#7f3f5b" /></mesh>}</group>)}</group>;
}

function Rubble({ position, stone }: { position: [number,number,number]; stone: THREE.Texture }) {
  return <group position={position}>{[[-0.2,0,0],[0.18,0.02,0.11],[0.02,0.03,-0.19],[-0.04,0.08,0.18]].map((p,i)=><mesh key={i} castShadow position={p as [number,number,number]} rotation={[i*0.12,i*0.23,0]}><dodecahedronGeometry args={[0.2-i*0.02,0]} /><meshStandardMaterial map={stone} color={i%2?"#8f856b":"#a29779"} roughness={1} /></mesh>)}</group>;
}
