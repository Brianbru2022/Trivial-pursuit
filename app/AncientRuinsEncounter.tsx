"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useState } from "react";
import * as THREE from "three";
import styles from "./AncientRuinsEncounter.module.css";

type PoiId = "gate" | "trench" | "tablet" | "sanctuary";
type Question = { prompt: string; answer: string; options: string[] };
type Poi = { id: PoiId; name: string; subtitle: string; reward: string; question: Question };
type Props = { onBack?: () => void };

const POIS: Poi[] = [
  { id: "gate", name: "Broken Gate", subtitle: "Decode the entrance inscription", reward: "+1 Knowledge", question: { prompt: "Which ancient civilisation built Machu Picchu?", answer: "Inca", options: ["Maya", "Inca", "Aztec", "Olmec"] } },
  { id: "trench", name: "Excavation Trench", subtitle: "Identify the buried artefact", reward: "+1 Relic", question: { prompt: "Archaeologists use which term for the study of layers in an excavation?", answer: "Stratigraphy", options: ["Topography", "Stratigraphy", "Cartography", "Epigraphy"] } },
  { id: "tablet", name: "Scholar's Tablet", subtitle: "Recover a clue to the sanctuary", reward: "+1 Clue", question: { prompt: "The Rosetta Stone was crucial in deciphering which script?", answer: "Egyptian hieroglyphs", options: ["Linear B", "Cuneiform", "Egyptian hieroglyphs", "Phoenician"] } },
  { id: "sanctuary", name: "Inner Sanctuary", subtitle: "Claim the legendary discovery", reward: "Legendary Discovery", question: { prompt: "Which archaeologist is most associated with the excavation of Knossos?", answer: "Arthur Evans", options: ["Howard Carter", "Heinrich Schliemann", "Arthur Evans", "Flinders Petrie"] } },
];

export default function AncientRuinsEncounter({ onBack }: Props) {
  const [completed, setCompleted] = useState<PoiId[]>([]);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [knowledge, setKnowledge] = useState(0);
  const [relics, setRelics] = useState(0);
  const [clues, setClues] = useState(0);
  const [discovery, setDiscovery] = useState(false);
  const sanctuaryUnlocked = completed.filter((id) => id !== "sanctuary").length >= 2;

  function choosePoi(poi: Poi) {
    if (completed.includes(poi.id)) return;
    if (poi.id === "sanctuary" && !sanctuaryUnlocked) return;
    setSelected(poi);
    setResult(null);
  }

  function answer(option: string) {
    if (!selected || result) return;
    const correct = option === selected.question.answer;
    setResult(correct ? "correct" : "wrong");
    if (!correct) return;
    setCompleted((current) => [...current, selected.id]);
    if (selected.id === "gate") setKnowledge((v) => v + 1);
    if (selected.id === "trench") setRelics((v) => v + 1);
    if (selected.id === "tablet") setClues((v) => v + 1);
    if (selected.id === "sanctuary") setDiscovery(true);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><small>ISLAND ENCOUNTER • ANCIENT RUINS</small><h1>The Ruins of Aster Vale</h1></div>
        <div className={styles.progress}>
          <span>Knowledge <b>{knowledge}</b></span><span>Relics <b>{relics}</b></span><span>Clues <b>{clues}</b></span><span>Sites <b>{completed.length}/4</b></span>
        </div>
        <button className={styles.back} onClick={onBack}>BACK TO WORLD</button>
      </header>

      <section className={styles.stage}>
        <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [10, 9, 10], zoom: 54, near: 0.1, far: 100 }}>
          <EncounterCamera />
          <color attach="background" args={["#102b30"]} />
          <ambientLight intensity={1.15} />
          <hemisphereLight args={["#dcecff", "#4b3a25", 1.25]} />
          <directionalLight castShadow position={[-6, 11, 8]} intensity={3.4} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <StableRuinsScene sanctuaryUnlocked={sanctuaryUnlocked} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={13} blur={2.5} far={8} />
        </Canvas>

        <div className={styles.poiOverlay}>
          {POIS.map((poi) => {
            const done = completed.includes(poi.id);
            const locked = poi.id === "sanctuary" && !sanctuaryUnlocked;
            return (
              <button key={poi.id} className={`${styles.poiButton} ${styles[`poi_${poi.id}`] || ""} ${done ? styles.done : ""} ${locked ? styles.locked : ""}`} disabled={done || locked} onClick={() => choosePoi(poi)}>
                <b>{done ? `✓ ${poi.name}` : locked ? `🔒 ${poi.name}` : poi.name}</b>
                <span>{done ? poi.reward : poi.subtitle}</span>
              </button>
            );
          })}
        </div>

        <aside className={styles.objective}>
          <small>YOUR EXPEDITION</small>
          <h2>{discovery ? "Discovery secured" : sanctuaryUnlocked ? "The sanctuary is open" : "Explore the ruins"}</h2>
          <p>{discovery ? "You recovered the Sun-Crowned Idol." : sanctuaryUnlocked ? "Two successful investigations revealed the Inner Sanctuary." : "Complete two investigations to unlock the Inner Sanctuary."}</p>
        </aside>

        {selected && (
          <div className={styles.modalShade}>
            <article className={styles.questionCard}>
              <small>{selected.name.toUpperCase()}</small>
              <h2>{selected.question.prompt}</h2>
              <div className={styles.answers}>
                {selected.question.options.map((option) => <button key={option} disabled={!!result} onClick={() => answer(option)} className={result && option === selected.question.answer ? styles.correctAnswer : ""}>{option}</button>)}
              </div>
              {result && <div className={result === "correct" ? styles.correct : styles.wrong}>{result === "correct" ? `Correct — ${selected.reward}` : `Not quite — the answer is ${selected.question.answer}.`}</div>}
              {result && <button className={styles.continue} onClick={() => { setSelected(null); setResult(null); }}>CONTINUE EXPLORING</button>}
            </article>
          </div>
        )}

        {discovery && <div className={styles.discoveryCard}><small>LEGENDARY DISCOVERY</small><div className={styles.idol}>☀</div><h2>Sun-Crowned Idol</h2><p>Ancient ceremonial relic • 5 Glory</p></div>}
      </section>
    </main>
  );
}

function EncounterCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(10, 9, 10);
    camera.lookAt(0, 0.2, 0);
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 54;
    ortho.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function StableRuinsScene({ sanctuaryUnlocked }: { sanctuaryUnlocked: boolean }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.42, 0]}><boxGeometry args={[10.2, 0.7, 7.4]} /><meshStandardMaterial color="#493b2c" roughness={1} /></mesh>
      <mesh receiveShadow position={[0, -0.06, 0]}><boxGeometry args={[9.7, 0.12, 6.9]} /><meshStandardMaterial color="#718d54" roughness={0.98} /></mesh>
      <mesh receiveShadow position={[-1.0, 0.05, -0.3]} rotation={[0, 0.12, 0]}><boxGeometry args={[6.8, 0.16, 4.8]} /><meshStandardMaterial color="#829b60" roughness={0.98} /></mesh>
      <BrokenGate />
      <ExcavationTrench />
      <ScholarsTablet />
      <InnerSanctuary unlocked={sanctuaryUnlocked} />
      <ExplorerMini />
      <Rubble position={[-3.3, 0.18, -1.8]} /><Rubble position={[3.2, 0.18, 2.1]} /><Rubble position={[0.1, 0.18, 2.5]} />
    </group>
  );
}

function Rubble({ position }: { position: [number, number, number] }) { return <group position={position}>{[[-0.22,0,0],[0.2,0.03,0.12],[0.02,0.02,-0.2]].map((p,i)=><mesh key={i} castShadow position={p as [number,number,number]} rotation={[i*.2,i*.3,0]}><dodecahedronGeometry args={[0.22-i*.03,0]} /><meshStandardMaterial color="#9b8d6c" roughness={1} /></mesh>)}</group>; }
function BrokenGate(){return <group position={[-2.55,0.15,1.35]} rotation={[0,.25,0]}><mesh castShadow position={[-.58,.62,0]}><boxGeometry args={[.34,1.24,.4]}/><meshStandardMaterial color="#cbbd92"/></mesh><mesh castShadow position={[.58,.5,0]}><boxGeometry args={[.34,1.0,.4]}/><meshStandardMaterial color="#b9aa82"/></mesh><mesh castShadow position={[-.08,1.16,0]} rotation={[0,0,-.08]}><boxGeometry args={[1.38,.25,.4]}/><meshStandardMaterial color="#d4c69b"/></mesh></group>}
function ExcavationTrench(){return <group position={[2.5,.08,1.25]}><mesh receiveShadow position={[0,-.05,0]}><boxGeometry args={[1.65,.15,1.05]}/><meshStandardMaterial color="#75543b"/></mesh><mesh castShadow position={[.35,.12,.05]}><dodecahedronGeometry args={[.27,0]}/><meshStandardMaterial color="#d0be8d"/></mesh><mesh castShadow position={[-.4,.1,-.12]} rotation={[.2,.3,0]}><boxGeometry args={[.42,.1,.28]}/><meshStandardMaterial color="#c6a36a"/></mesh></group>}
function ScholarsTablet(){return <group position={[-1.7,.18,-1.45]}><mesh castShadow position={[0,.45,0]} rotation={[-.12,.25,0]}><boxGeometry args={[.8,.9,.16]}/><meshStandardMaterial color="#b9aa80"/></mesh>{[-.16,0,.16].map(y=><mesh key={y} position={[0,.57+y,.09]}><boxGeometry args={[.46,.04,.018]}/><meshBasicMaterial color="#6f624b"/></mesh>)}</group>}
function InnerSanctuary({unlocked}:{unlocked:boolean}){return <group position={[1.65,.12,-1.55]}><mesh castShadow position={[0,.28,0]}><boxGeometry args={[1.55,.4,1.18]}/><meshStandardMaterial color="#9f936d"/></mesh><mesh castShadow position={[0,.62,0]}><boxGeometry args={[1.2,.28,.9]}/><meshStandardMaterial color="#b8aa80"/></mesh><mesh castShadow position={[0,.9,0]}><boxGeometry args={[.76,.28,.6]}/><meshStandardMaterial color={unlocked?"#d1c091":"#777166"}/></mesh>{unlocked&&<pointLight position={[0,1.2,0]} intensity={1.4} color="#ffd36a" distance={3}/>}</group>}
function ExplorerMini(){return <group position={[-.15,.12,.45]}><mesh castShadow><cylinderGeometry args={[.25,.3,.11,22]}/><meshStandardMaterial color="#c8a767"/></mesh><mesh castShadow position={[0,.38,0]}><capsuleGeometry args={[.14,.32,5,9]}/><meshStandardMaterial color="#b8483c"/></mesh><mesh castShadow position={[0,.68,0]}><sphereGeometry args={[.14,14,10]}/><meshStandardMaterial color="#d9b18a"/></mesh><mesh castShadow position={[0,.82,0]}><cylinderGeometry args={[.23,.18,.07,18]}/><meshStandardMaterial color="#4b3826"/></mesh></group>}
