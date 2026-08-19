"use client";

import { useEffect, useMemo, useState } from "react";
import Dice3D from "./Dice3D";
import styles from "./AsterVale2D.module.css";

type NodeId = "landing" | "gate" | "ridge" | "trench" | "sanctuary" | "grove" | "tablet" | "lookout";
type PoiId = "gate" | "trench" | "tablet" | "sanctuary";
type Result = "correct" | "wrong" | null;
type Question = { prompt: string; answer: string; options: string[] };
type Poi = { id: PoiId; node: NodeId; name: string; reward: string; question: Question };
type Props = { onBack?: () => void };

const ORDER: NodeId[] = ["landing", "gate", "ridge", "trench", "sanctuary", "grove", "tablet", "lookout"];

// Tuned to the actual cropped Aster Vale island artwork in public/assets/aster-vale/island.png.
const POS: Record<NodeId, { x: number; y: number }> = {
  landing: { x: 13.8, y: 54.4 },
  gate: { x: 24.4, y: 28.1 },
  ridge: { x: 43.4, y: 22.5 },
  trench: { x: 67.1, y: 31.1 },
  sanctuary: { x: 76.7, y: 46.0 },
  grove: { x: 68.3, y: 65.5 },
  tablet: { x: 45.1, y: 68.4 },
  lookout: { x: 19.2, y: 57.8 },
};

const POIS: Record<PoiId, Poi> = {
  gate: {
    id: "gate", node: "gate", name: "Broken Gate", reward: "+1 Knowledge",
    question: { prompt: "Which ancient civilisation built Machu Picchu?", answer: "Inca", options: ["Maya", "Inca", "Aztec", "Olmec"] },
  },
  trench: {
    id: "trench", node: "trench", name: "Excavation Trench", reward: "+1 Relic",
    question: { prompt: "Archaeologists use which term for the study of layers in an excavation?", answer: "Stratigraphy", options: ["Topography", "Stratigraphy", "Cartography", "Epigraphy"] },
  },
  tablet: {
    id: "tablet", node: "tablet", name: "Scholar's Tablet", reward: "+1 Clue",
    question: { prompt: "The Rosetta Stone was crucial in deciphering which script?", answer: "Egyptian hieroglyphs", options: ["Linear B", "Cuneiform", "Egyptian hieroglyphs", "Phoenician"] },
  },
  sanctuary: {
    id: "sanctuary", node: "sanctuary", name: "Inner Sanctuary", reward: "Sun-Crowned Idol • 5 Glory",
    question: { prompt: "Which archaeologist is most associated with the excavation of Knossos?", answer: "Arthur Evans", options: ["Howard Carter", "Heinrich Schliemann", "Arthur Evans", "Flinders Petrie"] },
  },
};

const NODE_POI: Partial<Record<NodeId, PoiId>> = { gate: "gate", trench: "trench", tablet: "tablet", sanctuary: "sanctuary" };

function clockwiseRoute(start: NodeId, steps: number) {
  const startIndex = ORDER.indexOf(start);
  return Array.from({ length: steps + 1 }, (_, i) => ORDER[(startIndex + i) % ORDER.length]);
}

export default function AsterVale2D({ onBack }: Props) {
  const [position, setPosition] = useState<NodeId>("landing");
  const [visualNode, setVisualNode] = useState<NodeId>("landing");
  const [route, setRoute] = useState<NodeId[]>(["landing"]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [moving, setMoving] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [turnComplete, setTurnComplete] = useState(false);
  const [completed, setCompleted] = useState<PoiId[]>([]);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [knowledge, setKnowledge] = useState(0);
  const [relics, setRelics] = useState(0);
  const [clues, setClues] = useState(0);
  const [discovery, setDiscovery] = useState(false);
  const [message, setMessage] = useState("Roll the D4. Movement around Aster Vale is clockwise.");

  const sanctuaryUnlocked = completed.filter((id) => id !== "sanctuary").length >= 2;
  const canLeave = position === "landing" && !moving && !selected;
  const currentPos = POS[visualNode];

  const siteCount = completed.length;
  const activePoi = NODE_POI[position];

  function applyRoll(value: number) {
    if (moving || selected || turnComplete || discovery) return;
    const path = clockwiseRoute(position, value);
    setRoll(value);
    setRoute(path);
    setRouteIndex(0);
    setMoving(true);
    setMessage(`D4: ${value}. Moving clockwise…`);
  }

  useEffect(() => {
    if (!moving) return;
    if (routeIndex >= route.length - 1) {
      const destination = route[route.length - 1];
      setPosition(destination);
      setMoving(false);
      finishLanding(destination);
      return;
    }
    const timer = window.setTimeout(() => {
      const next = routeIndex + 1;
      setRouteIndex(next);
      setVisualNode(route[next]);
    }, 390);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, routeIndex, route]);

  function finishLanding(id: NodeId) {
    const poiId = NODE_POI[id];
    setRoll(null);

    if (id === "sanctuary" && !sanctuaryUnlocked) {
      setTurnComplete(true);
      setMessage("The Inner Sanctuary is still sealed. Your turn ends here.");
      return;
    }

    if (poiId && !completed.includes(poiId)) {
      setSelected(POIS[poiId]);
      setResult(null);
      setMessage(`You reached ${POIS[poiId].name}. Answer correctly to earn another D4 roll.`);
      return;
    }

    setTurnComplete(true);
    setMessage(`${labelFor(id)}. No unresolved encounter here — your island turn ends.`);
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
    setMessage(selected.id === "sanctuary" ? "The Sun-Crowned Idol is yours." : "Correct — reward secured. Bonus D4 roll earned.");
  }

  function continueAfterQuestion() {
    if (!selected || !result) return;
    const bonus = result === "correct" && selected.id !== "sanctuary";
    const sanctuaryDone = selected.id === "sanctuary" && result === "correct";
    setSelected(null);
    setResult(null);
    if (bonus) {
      setTurnComplete(false);
      setMessage("Bonus roll earned — roll the D4 again.");
    } else {
      setTurnComplete(true);
      setMessage(sanctuaryDone ? "Legendary Discovery secured." : "Island turn over.");
    }
  }

  function endTurn() {
    setTurnComplete(false);
    setRoll(null);
    setRoute([position]);
    setRouteIndex(0);
    setVisualNode(position);
    setMessage(position === "landing" ? "Landing Beach: roll to continue or sail back to the world map." : "New island turn — roll the D4.");
  }

  const routePoints = useMemo(() => ORDER.map((id) => `${POS[id].x},${POS[id].y}`).join(" "), []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}><small>ISLAND EXPEDITION</small><h1>The Ruins of Aster Vale</h1></div>
        <div className={styles.stats}>
          <span>Knowledge <b>{knowledge}</b></span>
          <span>Relics <b>{relics}</b></span>
          <span>Clues <b>{clues}</b></span>
          <span>Sites <b>{siteCount}/4</b></span>
        </div>
        <button className={styles.worldButton} disabled={!canLeave} onClick={onBack}>{canLeave ? "SAIL TO WORLD" : "RETURN VIA BEACH"}</button>
      </header>

      <section className={styles.stage}>
        <div className={styles.boardFrame}>
          <img className={styles.boardArt} src="/assets/aster-vale/island.png" alt="Illustrated map of Aster Vale" />
          <div className={styles.lightSweep} />

          <svg className={styles.pathOverlay} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={`${routePoints} ${POS.landing.x},${POS.landing.y}`} />
          </svg>

          {ORDER.map((id) => {
            const poi = NODE_POI[id];
            const done = poi ? completed.includes(poi) : false;
            const locked = id === "sanctuary" && !sanctuaryUnlocked;
            return <div key={id} className={`${styles.nodeHit} ${visualNode === id ? styles.currentNode : ""} ${done ? styles.doneNode : ""} ${locked ? styles.lockedNode : ""}`} style={{ left: `${POS[id].x}%`, top: `${POS[id].y}%` }} aria-label={labelFor(id)} />;
          })}

          <div className={styles.explorer} style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%` }} aria-label={`Explorer at ${labelFor(visualNode)}`}>
            <div className={styles.explorerShadow} />
            <div className={styles.explorerBody}><span className={styles.hat} /><span className={styles.head} /><span className={styles.coat} /></div>
          </div>

          {discovery && <div className={styles.discoveryGlow} style={{ left: `${POS.sanctuary.x}%`, top: `${POS.sanctuary.y}%` }}>✦</div>}
        </div>

        <aside className={styles.currentPlaque}>
          <small>CURRENT LOCATION</small>
          <strong>{labelFor(visualNode)}</strong>
          <span>{moving ? "Travelling clockwise…" : activePoi && completed.includes(activePoi) ? "Completed encounter" : NODE_POI[visualNode] ? "Encounter site" : "Path space"}</span>
        </aside>

        <aside className={styles.objective}>
          <small>YOUR EXPEDITION</small>
          <h2>{discovery ? "Legendary discovery secured" : sanctuaryUnlocked ? "The sanctuary is open" : "Explore Aster Vale"}</h2>
          <p>{message}</p>
        </aside>

        <div className={styles.diceDock}>
          <Dice3D sides={4} onResult={applyRoll} disabled={moving || !!selected || turnComplete || discovery} />
        </div>
        {roll !== null && <div className={styles.rollBadge}>D4 <b>{roll}</b></div>}

        <div className={styles.actions}>
          {turnComplete && <button onClick={endTurn}>END ISLAND TURN</button>}
          {canLeave && <button onClick={onBack}>SAIL TO WORLD MAP</button>}
        </div>

        {selected && <div className={styles.modalShade}>
          <article className={styles.questionCard}>
            <small>{selected.name.toUpperCase()}</small>
            <h2>{selected.question.prompt}</h2>
            <div className={styles.answers}>{selected.question.options.map((option) => <button key={option} disabled={!!result} onClick={() => answer(option)} className={result && option === selected.question.answer ? styles.correctAnswer : ""}>{option}</button>)}</div>
            {result && <div className={result === "correct" ? styles.correct : styles.wrong}>{result === "correct" ? `Correct — ${selected.reward}${selected.id !== "sanctuary" ? " — bonus D4 roll" : ""}` : `Not quite — the answer is ${selected.question.answer}.`}</div>}
            {result && <button className={styles.continue} onClick={continueAfterQuestion}>{result === "correct" && selected.id !== "sanctuary" ? "TAKE BONUS ROLL" : "CONTINUE"}</button>}
          </article>
        </div>}

        {discovery && <div className={styles.discoveryCard}><small>LEGENDARY DISCOVERY</small><div>☀</div><h2>Sun-Crowned Idol</h2><p>5 Glory</p></div>}
      </section>
    </main>
  );
}

function labelFor(id: NodeId) {
  return ({ landing: "Landing Beach", gate: "Broken Gate", ridge: "Old Ridge Path", trench: "Excavation Trench", sanctuary: "Inner Sanctuary", grove: "Fig Grove", tablet: "Scholar's Tablet", lookout: "Clifftop Lookout" } as Record<NodeId, string>)[id];
}
