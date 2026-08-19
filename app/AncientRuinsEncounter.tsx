"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Dice3D, { DiceResultIcon } from "./Dice3D";
import styles from "./AncientRuinsEncounter.module.css";

type PoiId = "gate" | "trench" | "tablet" | "sanctuary";
type NodeId = "landing" | "gate" | "ridge" | "trench" | "sanctuary" | "grove" | "tablet" | "lookout";
type Question = { prompt: string; answer: string; options: string[] };
type Poi = { id: PoiId; node: NodeId; name: string; reward: string; question: Question };
type Node = { id: NodeId; name: string; position: [number, number, number]; poi?: PoiId };
type Props = { onBack?: () => void };

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

function exactRoutes(start: NodeId, steps: number) {
  const startIndex = ORDER.indexOf(start);
  const clockwise = Array.from({ length: steps + 1 }, (_, i) => ORDER[(startIndex + i) % ORDER.length]);
  const anticlockwise = Array.from({ length: steps + 1 }, (_, i) => ORDER[(startIndex - i + ORDER.length * 4) % ORDER.length]);
  const routes = new Map<NodeId, NodeId[]>();
  routes.set(clockwise[clockwise.length - 1], clockwise);
  routes.set(anticlockwise[anticlockwise.length - 1], anticlockwise);
  routes.delete(start);
  return routes;
}

export default function AncientRuinsEncounter({ onBack }: Props) {
  const [position, setPosition] = useState<NodeId>("landing");
  const [route, setRoute] = useState<NodeId[]>(["landing"]);
  const [roll, setRoll] = useState<number | null>(null);
  const [legalRoutes, setLegalRoutes] = useState<Map<NodeId, NodeId[]>>(new Map());
  const [moving, setMoving] = useState(false);
  const [turnComplete, setTurnComplete] = useState(false);
  const [completed, setCompleted] = useState<PoiId[]>([]);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [knowledge, setKnowledge] = useState(0);
  const [relics, setRelics] = useState(0);
  const [clues, setClues] = useState(0);
  const [discovery, setDiscovery] = useState(false);
  const [message, setMessage] = useState("Roll the die to move around Aster Vale.");

  const sanctuaryUnlocked = completed.filter((id) => id !== "sanctuary").length >= 2;
  const canLeave = position === "landing" && !moving && !selected;

  function applyRoll(value: number) {
    if (moving || selected || discovery || turnComplete) return;
    const routes = exactRoutes(position, value);
    if (!sanctuaryUnlocked) routes.delete("sanctuary");
    setRoll(value);
    setLegalRoutes(routes);
    setMessage(routes.size ? `Rolled ${value}. Choose one of the glowing spaces exactly ${value} steps away.` : `Rolled ${value}. No legal destination — end the turn and try again.`);
  }

  function chooseDestination(id: NodeId) {
    const path = legalRoutes.get(id);
    if (!path || moving) return;
    setRoute(path);
    setLegalRoutes(new Map());
    setMoving(true);
    setMessage(`Walking to ${BY_ID[id].name}…`);
    window.setTimeout(() => {
      setPosition(id);
      setRoll(null);
      setMoving(false);
      const node = BY_ID[id];
      if (node.poi && !completed.includes(node.poi)) {
        setSelected(POI_BY_ID[node.poi]);
        setResult(null);
        setMessage(`You reached ${node.name}. Resolve this encounter.`);
      } else {
        setTurnComplete(true);
        setMessage(`${node.name}. Movement complete — end the island turn.`);
      }
    }, Math.max(900, (path.length - 1) * 520));
  }

  function answer(option: string) {
    if (!selected || result) return;
    const correct = option === selected.question.answer;
    setResult(correct ? "correct" : "wrong");
    if (!correct) return;
    setCompleted((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    if (selected.id === "gate") setKnowledge((v) => v + 1);
    if (selected.id === "trench") setRelics((v) => v + 1);
    if (selected.id === "tablet") setClues((v) => v + 1);
    if (selected.id === "sanctuary") setDiscovery(true);
  }

  function closeQuestion() {
    setSelected(null);
    setResult(null);
    setTurnComplete(true);
    setMessage("Encounter resolved — end the island turn.");
  }

  function endIslandTurn() {
    if (moving || selected) return;
    setTurnComplete(false);
    setRoll(null);
    setLegalRoutes(new Map());
    setMessage(position === "landing" ? "You are at Landing Beach. Roll to explore, or sail back to the world map." : "Roll the die for your next move around Aster Vale.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><small>ISLAND ENCOUNTER • ANCIENT RUINS</small><h1>The Ruins of Aster Vale</h1></div>
        <div className={styles.progress}>
          <span>Knowledge <b>{knowledge}</b></span><span>Relics <b>{relics}</b></span><span>Clues <b>{clues}</b></span><span>Sites <b>{completed.length}/4</b></span>
        </div>
        <button className={styles.back} onClick={onBack} disabled={!canLeave}>{canLeave ? "SAIL TO WORLD" : "RETURN VIA BEACH"}</button>
      </header>

      <section className={styles.stage}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8.8, 10.4], fov: 38, near: 0.1, far: 100 }}>
          <color attach="background" args={["#10313b"]} />
          <ambientLight intensity={1.05} />
          <hemisphereLight args={["#dcecff", "#4b3a25", 1.3]} />
          <directionalLight castShadow position={[-6, 12, 8]} intensity={3.5} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <IslandBoard reachable={[...legalRoutes.keys()]} current={position} sanctuaryUnlocked={sanctuaryUnlocked} completed={completed} discovery={discovery} onChoose={chooseDestination} />
          <ExplorerPawn route={route} />
          <ContactShadows position={[0, -0.28, 0]} opacity={0.42} scale={14} blur={2.7} far={8} />
        </Canvas>

        {roll !== null && <DiceResultIcon value={roll} />}
        <aside className={styles.objective}>
          <small>YOUR EXPEDITION</small>
          <h2>{discovery ? "Discovery secured" : sanctuaryUnlocked ? "The sanctuary is open" : "Explore Aster Vale"}</h2>
          <p>{message}</p>
        </aside>
        <div className={styles.islandDice}><Dice3D onResult={applyRoll} disabled={moving || !!selected || discovery || turnComplete} /></div>
        <div className={styles.poiOverlay}>
          {NODES.map((node) => {
            const available = legalRoutes.has(node.id);
            const complete = node.poi ? completed.includes(node.poi) : false;
            const locked = node.id === "sanctuary" && !sanctuaryUnlocked;
            return <button key={node.id} className={`${styles.poiButton} ${styles[`poi_${node.id}`] || ""} ${available ? styles.available : ""} ${complete ? styles.done : ""} ${locked ? styles.locked : ""}`} onClick={() => chooseDestination(node.id)} disabled={!available}>
              <b>{locked ? `🔒 ${node.name}` : complete ? `✓ ${node.name}` : node.name}</b>
              <span>{available ? "Move here" : node.poi ? (complete ? POI_BY_ID[node.poi].reward : "Encounter site") : "Path space"}</span>
            </button>;
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
              {result && <div className={result === "correct" ? styles.correct : styles.wrong}>{result === "correct" ? `Correct — ${selected.reward}` : `Not quite — the answer is ${selected.question.answer}.`}</div>}
              {result && <button className={styles.continue} onClick={closeQuestion}>{result === "correct" ? "CONTINUE" : "ACCEPT RESULT"}</button>}
            </article>
          </div>
        )}

        {discovery && <div className={styles.discoveryCard}><small>LEGENDARY DISCOVERY</small><div className={styles.idol}>☀</div><h2>Sun-Crowned Idol</h2><p>Ancient ceremonial relic • 5 Glory</p></div>}
      </section>
    </main>
  );
}

function IslandBoard({ reachable, current, sanctuaryUnlocked, completed, discovery, onChoose }: { reachable: NodeId[]; current: NodeId; sanctuaryUnlocked: boolean; completed: PoiId[]; discovery: boolean; onChoose: (id: NodeId) => void }) {
  return <group position={[0, -0.55, 0]} rotation={[-0.08, 0, 0]} scale={1.1}>
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,-0.16,0]}><planeGeometry args={[15,10.5]}/><meshPhysicalMaterial color="#176f83" roughness={0.2} clearcoat={0.62}/></mesh>
    <IslandMass />
    {EDGES.map(([a,b]) => <PathSegment key={`${a}-${b}`} a={BY_ID[a].position} b={BY_ID[b].position} />)}
    {NODES.map((node) => <PathNode key={node.id} node={node} active={current===node.id} reachable={reachable.includes(node.id)} locked={node.id==="sanctuary"&&!sanctuaryUnlocked} onChoose={()=>onChoose(node.id)} />)}
    <BrokenGate completed={completed.includes("gate")}/><ExcavationTrench completed={completed.includes("trench")}/><ScholarsTablet completed={completed.includes("tablet")}/><InnerSanctuary unlocked={sanctuaryUnlocked} discovered={discovery}/>
    <PalmCluster /><Rubble position={[-3.2,.2,-1.8]} /><Rubble position={[2.8,.2,1.9]} />
  </group>;
}

function IslandMass(){return <group>
  <mesh receiveShadow position={[-.7,-.36,.15]} scale={[4.7,.45,3.25]} rotation={[0,.1,0]}><cylinderGeometry args={[1,1.08,1,18]}/><meshStandardMaterial color="#59462f" roughness={1}/></mesh>
  <mesh receiveShadow position={[.9,-.3,-.1]} scale={[3.5,.42,2.7]} rotation={[0,-.22,0]}><cylinderGeometry args={[1,1.06,1,16]}/><meshStandardMaterial color="#5f4a32" roughness={1}/></mesh>
  <mesh receiveShadow position={[-.8,-.04,.18]} scale={[4.45,.24,3.0]} rotation={[0,.1,0]}><cylinderGeometry args={[1,1.02,1,18]}/><meshStandardMaterial color="#78965a" roughness={.98}/></mesh>
  <mesh receiveShadow position={[1.0,.02,-.1]} scale={[3.25,.22,2.5]} rotation={[0,-.22,0]}><cylinderGeometry args={[1,1.02,1,16]}/><meshStandardMaterial color="#88a465" roughness={.98}/></mesh>
  <mesh receiveShadow position={[-1.1,.18,-.25]} scale={[2.8,.14,1.7]} rotation={[0,.12,0]}><cylinderGeometry args={[1,1.01,1,14]}/><meshStandardMaterial color="#9bb276" roughness={.97}/></mesh>
</group>}

function PathSegment({a,b}:{a:[number,number,number];b:[number,number,number]}){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),mid=A.clone().lerp(B,.5),distance=A.distanceTo(B),angle=Math.atan2(B.z-A.z,B.x-A.x);return <mesh receiveShadow castShadow position={[mid.x,.22,mid.z]} rotation={[0,-angle,0]}><boxGeometry args={[distance,.08,.22]}/><meshStandardMaterial color="#c4b184" roughness={.96}/></mesh>}
function PathNode({node,active,reachable,locked,onChoose}:{node:Node;active:boolean;reachable:boolean;locked:boolean;onChoose:()=>void}){return <group position={node.position} onClick={e=>{e.stopPropagation();if(reachable)onChoose()}}>
  <mesh castShadow position={[0,.23,0]}><cylinderGeometry args={[.26,.3,.09,20]}/><meshStandardMaterial color={locked?"#6f6b61":reachable?"#f1cf61":active?"#d99043":"#d4c598"} metalness={.05}/></mesh>
  {reachable&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.3,0]}><ringGeometry args={[.32,.5,32]}/><meshBasicMaterial color="#78ffad"/></mesh>}
</group>}

function ExplorerPawn({route}:{route:NodeId[]}){const ref=useRef<THREE.Group>(null),segment=useRef(0);useEffect(()=>{segment.current=0;const start=BY_ID[route[0]].position;if(ref.current)ref.current.position.set(start[0],.52,start[2])},[route]);useFrame((_,delta)=>{if(!ref.current)return;const idx=Math.min(segment.current,route.length-1),next=Math.min(idx+1,route.length-1),p=BY_ID[route[next]].position,target=new THREE.Vector3(p[0],.52,p[2]);ref.current.position.lerp(target,1-Math.pow(.0015,delta));if(ref.current.position.distanceTo(target)<.045&&next>idx)segment.current=next});const start=BY_ID[route[0]].position;return <group ref={ref} position={[start[0],.52,start[2]]}>
  <mesh castShadow><cylinderGeometry args={[.28,.33,.11,22]}/><meshStandardMaterial color="#c8a767"/></mesh><mesh castShadow position={[0,.4,0]}><capsuleGeometry args={[.14,.34,5,9]}/><meshStandardMaterial color="#b8483c"/></mesh><mesh castShadow position={[0,.72,0]}><sphereGeometry args={[.14,14,10]}/><meshStandardMaterial color="#d9b18a"/></mesh><mesh castShadow position={[0,.86,0]}><cylinderGeometry args={[.23,.18,.07,18]}/><meshStandardMaterial color="#4b3826"/></mesh>
</group>}

function BrokenGate({completed}:{completed:boolean}){return <group position={[-2.4,.18,.8]} rotation={[0,.25,0]}><mesh castShadow position={[-.5,.55,0]}><boxGeometry args={[.28,1.1,.34]}/><meshStandardMaterial color="#cbbd92"/></mesh><mesh castShadow position={[.5,.46,0]}><boxGeometry args={[.28,.92,.34]}/><meshStandardMaterial color="#b9aa82"/></mesh><mesh castShadow position={[-.08,1.0,0]}><boxGeometry args={[1.15,.2,.32]}/><meshStandardMaterial color={completed?"#eadb9f":"#d4c69b"} emissive={completed?"#8b6b20":"#000000"} emissiveIntensity={completed?.65:0}/></mesh>{completed&&<pointLight position={[0,1.05,.3]} intensity={.7} color="#ffd36a" distance={2}/>}</group>}
function ExcavationTrench({completed}:{completed:boolean}){return <group position={[1.25,.12,1.1]}><mesh receiveShadow position={[0,-.02,0]}><boxGeometry args={[1.35,.12,.8]}/><meshStandardMaterial color="#75543b"/></mesh><mesh castShadow position={[.3,.12,.05]}><dodecahedronGeometry args={[.23,0]}/><meshStandardMaterial color="#d0be8d"/></mesh>{completed&&<mesh castShadow position={[-.15,.2,-.05]}><octahedronGeometry args={[.2,0]}/><meshStandardMaterial color="#c9a14a" metalness={.25} emissive="#6f4f12" emissiveIntensity={.25}/></mesh>}</group>}
function ScholarsTablet({completed}:{completed:boolean}){return <group position={[-1.2,.18,-1.6]}><mesh castShadow position={[0,.42,0]} rotation={[-.12,.25,0]}><boxGeometry args={[.7,.8,.14]}/><meshStandardMaterial color="#b9aa80"/></mesh>{[-.15,0,.15].map((y,i)=><mesh key={i} position={[0,.46+y,.09]}><boxGeometry args={[.38,.03,.015]}/><meshBasicMaterial color={completed?"#ffd96a":"#6b5e48"}/></mesh>)}{completed&&<pointLight position={[0,.55,.25]} intensity={.8} color="#ffd96a" distance={2}/>}</group>}
function InnerSanctuary({unlocked,discovered}:{unlocked:boolean;discovered:boolean}){return <group position={[2.7,.16,-.35]}><mesh castShadow position={[0,.26,0]}><boxGeometry args={[1.35,.36,1.0]}/><meshStandardMaterial color="#9f936d"/></mesh><mesh castShadow position={[0,.58,0]}><boxGeometry args={[1.0,.26,.76]}/><meshStandardMaterial color="#b8aa80"/></mesh><mesh castShadow position={[0,.84,0]}><boxGeometry args={[.64,.24,.5]}/><meshStandardMaterial color={unlocked?"#d1c091":"#777166"}/></mesh>{unlocked&&<pointLight position={[0,1.1,0]} intensity={discovered?.45:1.3} color="#ffd36a" distance={3}/>} {discovered&&<mesh castShadow position={[0,1.05,0]}><octahedronGeometry args={[.22,0]}/><meshStandardMaterial color="#f1c95e" metalness={.2} emissive="#7c5a16" emissiveIntensity={.4}/></mesh>}</group>}
function PalmCluster(){return <group position={[.8,.12,-2.3]}>{[-.45,0,.45].map((x,i)=><group key={i} position={[x,0,(i-1)*.16]}><mesh castShadow position={[0,.35,0]}><cylinderGeometry args={[.05,.08,.7,8]}/><meshStandardMaterial color="#70502f"/></mesh><mesh castShadow position={[0,.76,0]}><coneGeometry args={[.22,.55,6]}/><meshStandardMaterial color="#3f7545"/></mesh></group>)}</group>}
function Rubble({position}:{position:[number,number,number]}){return <group position={position}>{[[-.18,0,0],[.18,.02,.1],[0,.02,-.18]].map((p,i)=><mesh key={i} castShadow position={p as [number,number,number]}><dodecahedronGeometry args={[.2-i*.03,0]}/><meshStandardMaterial color="#9b8d6c"/></mesh>)}</group>}
