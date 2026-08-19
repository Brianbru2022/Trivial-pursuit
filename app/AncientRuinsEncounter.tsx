"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import styles from "./AncientRuinsEncounter.module.css";

type PoiId = "gate" | "trench" | "tablet" | "sanctuary";
type Question = { prompt: string; answer: string; options: string[] };
type Poi = { id: PoiId; name: string; subtitle: string; position: [number, number, number]; reward: string; question: Question };
type Props = { onBack?: () => void };

const POIS: Poi[] = [
  { id: "gate", name: "Broken Gate", subtitle: "Decode the entrance inscription", position: [-2.25, 0.28, 1.4], reward: "+1 Knowledge", question: { prompt: "Which ancient civilisation built Machu Picchu?", answer: "Inca", options: ["Maya", "Inca", "Aztec", "Olmec"] } },
  { id: "trench", name: "Excavation Trench", subtitle: "Identify the buried artefact", position: [2.15, 0.26, 1.25], reward: "+1 Relic", question: { prompt: "Archaeologists use which term for the study of layers in an excavation?", answer: "Stratigraphy", options: ["Topography", "Stratigraphy", "Cartography", "Epigraphy"] } },
  { id: "tablet", name: "Scholar's Tablet", subtitle: "Recover a clue to the sanctuary", position: [-1.55, 0.34, -1.35], reward: "+1 Clue", question: { prompt: "The Rosetta Stone was crucial in deciphering which script?", answer: "Egyptian hieroglyphs", options: ["Linear B", "Cuneiform", "Egyptian hieroglyphs", "Phoenician"] } },
  { id: "sanctuary", name: "Inner Sanctuary", subtitle: "Claim the legendary discovery", position: [1.45, 0.42, -1.5], reward: "Legendary Discovery", question: { prompt: "Which Greek archaeologist is most associated with the excavation of Knossos?", answer: "Arthur Evans", options: ["Howard Carter", "Heinrich Schliemann", "Arthur Evans", "Flinders Petrie"] } },
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
    if (poi.id === "sanctuary" && !sanctuaryUnlocked) return;
    if (completed.includes(poi.id)) return;
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

  function closeQuestion() {
    setSelected(null);
    setResult(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><small>ISLAND ENCOUNTER • ANCIENT RUINS</small><h1>The Ruins of Aster Vale</h1></div>
        <div className={styles.progress}>
          <span>Knowledge <b>{knowledge}</b></span>
          <span>Relics <b>{relics}</b></span>
          <span>Clues <b>{clues}</b></span>
          <span>Sites <b>{completed.length}/4</b></span>
        </div>
        <button className={styles.back} onClick={onBack}>BACK TO WORLD</button>
      </header>

      <section className={styles.stage}>
        <Canvas orthographic shadows dpr={[1, 1.6]} camera={{ position: [8.6, 7.2, 8.6], zoom: 58, near: 0.1, far: 80 }}>
          <EncounterCamera />
          <color attach="background" args={["#102b30"]} />
          <ambientLight intensity={1.05} />
          <hemisphereLight args={["#dcecff", "#463923", 1.25]} />
          <directionalLight castShadow position={[-5, 10, 7]} intensity={3.6} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <RuinsScene completed={completed} sanctuaryUnlocked={sanctuaryUnlocked} onSelect={choosePoi} />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.42} scale={14} blur={2.8} far={8} />
        </Canvas>

        <aside className={styles.objective}>
          <small>YOUR EXPEDITION</small>
          <h2>{discovery ? "Discovery secured" : sanctuaryUnlocked ? "The sanctuary is open" : "Explore the ruins"}</h2>
          <p>{discovery ? "You recovered the Sun-Crowned Idol. This island's legendary discovery is yours." : sanctuaryUnlocked ? "Two successful investigations revealed the way into the Inner Sanctuary." : "Complete two investigations to reveal the entrance to the Inner Sanctuary."}</p>
          <div className={styles.siteList}>
            {POIS.map((poi) => {
              const done = completed.includes(poi.id);
              const locked = poi.id === "sanctuary" && !sanctuaryUnlocked;
              return <div key={poi.id} className={`${styles.siteRow} ${done ? styles.done : ""} ${locked ? styles.locked : ""}`}><span>{done ? "✓" : locked ? "🔒" : "•"}</span><div><b>{poi.name}</b><small>{done ? poi.reward : poi.subtitle}</small></div></div>;
            })}
          </div>
        </aside>

        {selected && (
          <div className={styles.modalShade}>
            <article className={styles.questionCard}>
              <small>{selected.name.toUpperCase()}</small>
              <h2>{selected.question.prompt}</h2>
              <div className={styles.answers}>
                {selected.question.options.map((option) => (
                  <button key={option} disabled={!!result} onClick={() => answer(option)} className={result && option === selected.question.answer ? styles.correctAnswer : ""}>{option}</button>
                ))}
              </div>
              {result && <div className={result === "correct" ? styles.correct : styles.wrong}>{result === "correct" ? `Correct — ${selected.reward}` : `Not quite — the answer is ${selected.question.answer}.`}</div>}
              {result && <button className={styles.continue} onClick={closeQuestion}>CONTINUE EXPLORING</button>}
            </article>
          </div>
        )}

        {discovery && (
          <div className={styles.discoveryCard}>
            <small>LEGENDARY DISCOVERY</small>
            <div className={styles.idol}>☀</div>
            <h2>Sun-Crowned Idol</h2>
            <p>Ancient ceremonial relic • 5 Glory</p>
          </div>
        )}
      </section>
    </main>
  );
}

function EncounterCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(8.6, 7.2, 8.6);
    camera.lookAt(0, 0.25, 0);
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = 58;
    ortho.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function RuinsScene({ completed, sanctuaryUnlocked, onSelect }: { completed: PoiId[]; sanctuaryUnlocked: boolean; onSelect: (poi: Poi) => void }) {
  const groundShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-4.5, -2.7);
    shape.quadraticCurveTo(-4.9, 0.2, -3.4, 2.9);
    shape.quadraticCurveTo(-0.8, 4.1, 2.6, 3.2);
    shape.quadraticCurveTo(4.8, 2.1, 4.3, -1.2);
    shape.quadraticCurveTo(2.7, -3.7, -0.8, -3.4);
    shape.quadraticCurveTo(-3.3, -3.5, -4.5, -2.7);
    return shape;
  }, []);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <shapeGeometry args={[groundShape, 20]} />
        <meshStandardMaterial color="#6f8d53" roughness={0.98} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} scale={1.05}>
        <shapeGeometry args={[groundShape, 20]} />
        <meshStandardMaterial color="#4a3d2d" roughness={1} />
      </mesh>
      <BrokenGate />
      <ExcavationTrench />
      <ScholarsTablet />
      <InnerSanctuary unlocked={sanctuaryUnlocked} />
      <ExplorerMini />
      {POIS.map((poi) => {
        const done = completed.includes(poi.id);
        const locked = poi.id === "sanctuary" && !sanctuaryUnlocked;
        return <PoiMarker key={poi.id} poi={poi} done={done} locked={locked} onSelect={() => onSelect(poi)} />;
      })}
    </group>
  );
}

function PoiMarker({ poi, done, locked, onSelect }: { poi: Poi; done: boolean; locked: boolean; onSelect: () => void }) {
  const colour = done ? "#5f8f62" : locked ? "#655f55" : "#e1b95b";
  return (
    <group position={poi.position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.38, 0.56, 36]} /><meshBasicMaterial color={colour} transparent opacity={locked ? 0.45 : 0.95} /></mesh>
      <mesh castShadow position={[0, 0.16, 0]}><cylinderGeometry args={[0.15, 0.18, 0.22, 18]} /><meshStandardMaterial color={colour} metalness={0.2} roughness={0.45} /></mesh>
      <Html center position={[0, 0.75, 0]} distanceFactor={8.5}>
        <button className={`${styles.poiLabel} ${locked ? styles.poiLocked : ""}`} disabled={locked || done} onClick={(e) => { e.stopPropagation(); onSelect(); }}>{done ? `✓ ${poi.name}` : locked ? `Locked • ${poi.name}` : poi.name}</button>
      </Html>
    </group>
  );
}

function BrokenGate() {
  return <group position={[-2.25, 0.18, 1.45]} rotation={[0, 0.35, 0]}><mesh castShadow position={[-0.55, 0.55, 0]}><boxGeometry args={[0.32, 1.1, 0.36]} /><meshStandardMaterial color="#cbbd92" /></mesh><mesh castShadow position={[0.55, 0.46, 0]}><boxGeometry args={[0.32, 0.92, 0.36]} /><meshStandardMaterial color="#b9aa82" /></mesh><mesh castShadow position={[-0.1, 1.05, 0]} rotation={[0, 0, -0.08]}><boxGeometry args={[1.25, 0.23, 0.35]} /><meshStandardMaterial color="#d4c69b" /></mesh></group>;
}
function ExcavationTrench() {
  return <group position={[2.15, 0.06, 1.25]}><mesh receiveShadow position={[0, -0.06, 0]}><boxGeometry args={[1.4, 0.14, 0.9]} /><meshStandardMaterial color="#75543b" /></mesh><mesh castShadow position={[0.35, 0.12, 0.05]}><dodecahedronGeometry args={[0.25, 0]} /><meshStandardMaterial color="#d0be8d" /></mesh><mesh castShadow position={[-0.35, 0.1, -0.1]} rotation={[0.2, 0.3, 0]}><boxGeometry args={[0.35, 0.09, 0.24]} /><meshStandardMaterial color="#c6a36a" /></mesh></group>;
}
function ScholarsTablet() {
  return <group position={[-1.55, 0.18, -1.35]}><mesh castShadow position={[0, 0.38, 0]} rotation={[-0.12, 0.25, 0]}><boxGeometry args={[0.72, 0.78, 0.14]} /><meshStandardMaterial color="#b9aa80" /></mesh>{[-0.14, 0, 0.14].map((y) => <mesh key={y} position={[0, 0.5 + y, 0.08]}><boxGeometry args={[0.42, 0.035, 0.015]} /><meshBasicMaterial color="#6f624b" /></mesh>)}</group>;
}
function InnerSanctuary({ unlocked }: { unlocked: boolean }) {
  return <group position={[1.45, 0.14, -1.5]}><mesh castShadow position={[0, 0.25, 0]}><boxGeometry args={[1.3, 0.34, 1.0]} /><meshStandardMaterial color="#9f936d" /></mesh><mesh castShadow position={[0, 0.54, 0]}><boxGeometry args={[1.0, 0.25, 0.78]} /><meshStandardMaterial color="#b8aa80" /></mesh><mesh castShadow position={[0, 0.78, 0]}><boxGeometry args={[0.66, 0.23, 0.54]} /><meshStandardMaterial color={unlocked ? "#d1c091" : "#7e7767"} /></mesh><pointLight position={[0, 1.0, 0]} intensity={unlocked ? 1.3 : 0} color="#ffd36a" distance={3} /></group>;
}
function ExplorerMini() {
  return <group position={[-0.1, 0.18, 0.3]}><mesh castShadow><cylinderGeometry args={[0.24, 0.28, 0.11, 22]} /><meshStandardMaterial color="#c8a767" /></mesh><mesh castShadow position={[0, 0.36, 0]}><capsuleGeometry args={[0.13, 0.3, 5, 9]} /><meshStandardMaterial color="#b8483c" /></mesh><mesh castShadow position={[0, 0.65, 0]}><sphereGeometry args={[0.13, 14, 10]} /><meshStandardMaterial color="#d9b18a" /></mesh><mesh castShadow position={[0, 0.79, 0]}><cylinderGeometry args={[0.22, 0.17, 0.07, 18]} /><meshStandardMaterial color="#4b3826" /></mesh></group>;
}