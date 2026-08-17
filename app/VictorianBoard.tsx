"use client";

import { useMemo, useRef, useState } from "react";
import Dice3D, { DiceResultIcon } from "./Dice3D";
import VictorianLocomotive from "./VictorianLocomotive";
import { categories, questions, type Question } from "./gameData";
import {
  componentOrder,
  componentRecipes,
  reachableSites,
  victorianSites,
  type ComponentKey,
  type ResourceKey,
} from "./victorianGame";
import styles from "./VictorianBoard.module.css";

type Player = {
  name: string;
  site: number;
  resources: Record<ResourceKey, number>;
  components: ComponentKey[];
  rerolls: number;
};

type Props = { names: [string, string]; onExit: () => void };
type Challenge = {
  kind: "location" | "build";
  question: Question;
  siteId?: number;
  component?: ComponentKey;
  round: number;
  correct: number;
};

const emptyResources = (): Record<ResourceKey, number> => ({ coal: 0, iron: 0, knowledge: 0, capital: 0 });
const symbols: Record<string, string> = {
  start: "⚒", coal: "◆", iron: "▰", engineering: "⚙", university: "▤",
  port: "£", railway: "●", event: "!", exhibition: "★",
};

const eventCards = [
  { title: "Railway Mania", text: "Investors pile into the railway boom. Gain 2 Capital.", apply: (p: Player) => { p.resources.capital += 2; } },
  { title: "Industrial Breakthrough", text: "A clever improvement wins you 1 Knowledge and 1 Iron.", apply: (p: Player) => { p.resources.knowledge += 1; p.resources.iron += 1; } },
  { title: "Government Contract", text: "A public contract advances the works. Gain 1 Capital and 1 Coal.", apply: (p: Player) => { p.resources.capital += 1; p.resources.coal += 1; } },
  { title: "Express Service", text: "Your railway connections pay off. Gain a reroll token.", apply: (p: Player) => { p.rerolls += 1; } },
];

function normalise(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

export default function VictorianBoard({ names, onExit }: Props) {
  const [players, setPlayers] = useState<Player[]>([
    { name: names[0] || "Player 1", site: 0, resources: emptyResources(), components: [], rerolls: 0 },
    { name: names[1] || "Player 2", site: 0, resources: emptyResources(), components: [], rerolls: 0 },
  ]);
  const [active, setActive] = useState(0);
  const [roll, setRoll] = useState<number | null>(null);
  const [targets, setTargets] = useState<number[]>([]);
  const [message, setMessage] = useState("Roll the die. Correct answers earn the reward on the space.");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [reveal, setReveal] = useState<boolean | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [eventCard, setEventCard] = useState<{ title: string; text: string } | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const player = players[active];
  const ready = player.components.length === componentOrder.length;
  const atWorks = victorianSites[player.site].kind === "engineering";

  const canBuild = useMemo(() => componentOrder.filter((key) => {
    if (player.components.includes(key)) return false;
    return Object.entries(componentRecipes[key].cost).every(([resource, amount]) =>
      player.resources[resource as ResourceKey] >= (amount ?? 0));
  }), [player]);

  const randomQuestion = () => questions[Math.floor(Math.random() * questions.length)];

  function speakQuestion(question: Question) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${player.name}. ${categories[question.category].name}. ${question.question}`);
    utterance.lang = "en-GB";
    utterance.rate = 0.93;
    utterance.pitch = 0.96;
    window.speechSynthesis.speak(utterance);
  }

  function openChallenge(next: Challenge) {
    setChallenge(next);
    setAnswer("");
    setReveal(null);
    window.setTimeout(() => speakQuestion(next.question), 280);
  }

  function listenForAnswer() {
    if (typeof window === "undefined") return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Speech recognition is unavailable in this browser. Type the answer instead.");
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.onresult = (event: any) => setAnswer(event.results[event.results.length - 1][0]?.transcript ?? "");
    recognitionRef.current = recognition;
    recognition.start();
  }

  function finishRoll(value: number) {
    setRoll(value);
    const exact = reachableSites(player.site, value);
    setTargets(exact);
    setMessage(`Rolled ${value}. Move exactly ${value} spaces clockwise or anticlockwise.`);
  }

  function useReroll() {
    if (player.rerolls < 1 || roll === null) return;
    const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
    next[active].rerolls -= 1;
    setPlayers(next);
    setRoll(null);
    setTargets([]);
    setMessage("Reroll token used. Roll again.");
  }

  function moveTo(id: number) {
    if (!targets.includes(id)) return;
    const site = victorianSites[id];
    const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
    next[active].site = id;
    setPlayers(next);
    setTargets([]);

    if (site.kind === "exhibition") {
      if (ready) {
        setWinner(player.name);
      } else {
        setMessage("Crystal Palace remains closed to you until your locomotive is complete.");
      }
      return;
    }

    if (site.kind === "engineering") {
      setMessage("Engineering Works reached. Attempt any component you can afford, or end your turn.");
      return;
    }

    if (site.kind === "event") {
      const card = eventCards[Math.floor(Math.random() * eventCards.length)];
      card.apply(next[active]);
      setPlayers(next);
      setEventCard({ title: card.title, text: card.text });
      setMessage(`${card.title}: ${card.text}`);
      return;
    }

    openChallenge({ kind: "location", question: randomQuestion(), siteId: id, round: 1, correct: 0 });
  }

  function beginBuild(key: ComponentKey) {
    if (!atWorks || !canBuild.includes(key)) return;
    const recipe = componentRecipes[key];
    setMessage(`${recipe.name}: pass ${recipe.needed} of ${recipe.questions} construction questions.`);
    openChallenge({ kind: "build", question: randomQuestion(), component: key, round: 1, correct: 0 });
  }

  function judge() {
    if (!challenge) return;
    const candidate = normalise(answer);
    const accepted = [challenge.question.answer, ...(challenge.question.alternatives ?? [])].map(normalise);
    const correct = accepted.some((item) => candidate === item || (candidate && candidate.includes(item)) || (candidate && item.includes(candidate)));
    setReveal(correct);
  }

  function continueChallenge() {
    if (!challenge || reveal === null) return;
    const correctCount = challenge.correct + (reveal ? 1 : 0);

    if (challenge.kind === "location") {
      const site = victorianSites[challenge.siteId!];
      if (reveal && site.reward) {
        const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
        Object.entries(site.reward).forEach(([resource, amount]) => next[active].resources[resource as ResourceKey] += amount ?? 0);
        setPlayers(next);
        setMessage(`Correct. ${site.name} awards ${Object.entries(site.reward).map(([r,a]) => `${a} ${r}`).join(" + ")}.`);
      } else {
        setMessage("Incorrect — no resource reward from this stop.");
      }
      setChallenge(null); setAnswer(""); setReveal(null);
      return;
    }

    const key = challenge.component!;
    const recipe = componentRecipes[key];
    if (challenge.round < recipe.questions) {
      const nextQuestion = randomQuestion();
      setChallenge({ ...challenge, question: nextQuestion, round: challenge.round + 1, correct: correctCount });
      setAnswer(""); setReveal(null);
      window.setTimeout(() => speakQuestion(nextQuestion), 250);
      return;
    }

    if (correctCount >= recipe.needed) {
      const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
      Object.entries(recipe.cost).forEach(([resource, amount]) => next[active].resources[resource as ResourceKey] -= amount ?? 0);
      next[active].components.push(key);
      setPlayers(next);
      setMessage(`${recipe.name} successfully constructed and fitted to ${player.name}'s locomotive.`);
    } else {
      setMessage(`${recipe.name} construction failed. Your resources are safe; try again at an Engineering Works.`);
    }
    setChallenge(null); setAnswer(""); setReveal(null);
  }

  function endTurn() {
    if (winner) return;
    const nextPlayer = (active + 1) % players.length;
    setActive(nextPlayer);
    setRoll(null); setTargets([]); setChallenge(null); setEventCard(null); setAnswer(""); setReveal(null);
    setMessage(`${players[nextPlayer].name}'s turn — roll the die.`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.turnPlaque}><b>{player.name}</b><span>YOUR TURN</span></div>
        <div className={styles.title}><span>1851</span><h1>THE GREAT EXHIBITION</h1><p>Gather • Build • Race to London</p></div>
        <div className={styles.headerActions}><span>{players[(active + 1) % 2].name} waiting</span><button onClick={onExit}>EXIT</button></div>
      </header>

      {roll !== null && <DiceResultIcon value={roll} />}

      <section className={styles.mapWrap}>
        <div className={styles.scene} aria-hidden="true" />
        <svg className={styles.rails} viewBox="0 0 100 100" preserveAspectRatio="none">
          {victorianSites.flatMap((site) => site.links.filter((id) => id > site.id).map((id) => {
            const other = victorianSites[id];
            return <line key={`${site.id}-${id}`} x1={site.x} y1={site.y} x2={other.x} y2={other.y} />;
          }))}
        </svg>

        {victorianSites.map((site) => (
          <button
            key={site.id}
            title={site.name}
            className={`${styles.site} ${site.major ? styles.majorSite : styles.minorSite} ${styles[site.kind]} ${targets.includes(site.id) ? styles.target : ""}`}
            style={{ left: `${site.x}%`, top: `${site.y}%` }}
            disabled={!targets.includes(site.id)}
            onClick={() => moveTo(site.id)}
          >
            <i>{symbols[site.kind]}</i>{(site.major || targets.includes(site.id)) && <span>{site.shortName}</span>}
          </button>
        ))}

        {players.map((p, index) => {
          const site = victorianSites[p.site];
          return <div key={index} className={`${styles.pawn} ${index ? styles.pawnTwo : ""}`} style={{ left: `${site.x}%`, top: `${site.y}%` }}>{index + 1}</div>;
        })}

        {roll === null && !winner && <Dice3D onResult={finishRoll} />}
        <aside className={styles.palace}><span>1851</span><div className={styles.palaceDrawing}>♜</div><b>CRYSTAL PALACE</b><small>FINISH</small></aside>
      </section>

      <section className={styles.workshop}>
        <div className={styles.resources}>
          <b>RESOURCES</b>
          <span>◆ Coal <strong>{player.resources.coal}</strong></span>
          <span>▰ Iron <strong>{player.resources.iron}</strong></span>
          <span>▤ Knowledge <strong>{player.resources.knowledge}</strong></span>
          <span>£ Capital <strong>{player.resources.capital}</strong></span>
          <span>↻ Rerolls <strong>{player.rerolls}</strong></span>
        </div>

        <div className={styles.buildArea}>
          <div className={styles.workshopTitle}>YOUR LOCOMOTIVE <span>{atWorks ? "Engineering Works open" : "Build only at an Engineering Works"}</span></div>
          <VictorianLocomotive completed={player.components} />
          <div className={styles.parts}>
            {componentOrder.map((key) => {
              const built = player.components.includes(key);
              const available = atWorks && canBuild.includes(key);
              const recipe = componentRecipes[key];
              return (
                <button key={key} className={`${styles.part} ${built ? styles.built : ""} ${available ? styles.available : ""}`} disabled={!available || built} onClick={() => beginBuild(key)}>
                  <b>{recipe.name}</b>
                  <small>{built ? "✓ COMPLETED" : `${Object.entries(recipe.cost).map(([r,a]) => `${a} ${r}`).join(" • ")} | ${recipe.needed}/${recipe.questions} quiz`}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{message}</p>
        <div>
          {roll !== null && player.rerolls > 0 && targets.length > 0 && <button onClick={useReroll}>USE REROLL</button>}
          <span>{ready ? "✓ ENGINE COMPLETE — HEAD FOR CRYSTAL PALACE" : `${player.components.length}/6 components complete`}</span>
          {roll !== null && !challenge && !winner && <button onClick={endTurn}>PASS TO {players[(active + 1) % players.length].name.toUpperCase()} →</button>}
        </div>
      </footer>

      {eventCard && <div className={styles.eventOverlay}><article><span>VICTORIAN EVENT</span><h2>{eventCard.title}</h2><p>{eventCard.text}</p><button onClick={() => setEventCard(null)}>CONTINUE</button></article></div>}

      {challenge && (
        <div className={styles.challenge}>
          <article>
            <span className={styles.challengeType}>{challenge.kind === "build" ? `ENGINEERING CHALLENGE • ${componentRecipes[challenge.component!].name}` : `${victorianSites[challenge.siteId!].shortName} • RESOURCE QUESTION`}</span>
            <div className={styles.category}>{categories[challenge.question.category].name} • {challenge.kind === "build" ? `Question ${challenge.round}/${componentRecipes[challenge.component!].questions}` : "Answer correctly to collect the reward"}</div>
            <h2>{challenge.question.question}</h2>
            {reveal === null ? <>
              <div className={styles.answerRow}><input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && judge()} placeholder="Say or type your answer…"/><button className={listening ? styles.listening : ""} onClick={listenForAnswer}>{listening ? "● LISTENING" : "◉ SPEAK"}</button></div>
              <div className={styles.challengeButtons}><button onClick={() => speakQuestion(challenge.question)}>↻ HEAR AGAIN</button><button onClick={judge}>LOCK ANSWER</button></div>
            </> : <>
              <div className={reveal ? styles.correct : styles.wrong}>{reveal ? "✓ CORRECT" : "× NOT QUITE"}</div>
              <p>The answer is <b>{challenge.question.answer}</b>.</p>
              <button onClick={continueChallenge}>CONTINUE →</button>
            </>}
          </article>
        </div>
      )}

      {winner && <div className={styles.win}><span>THE GREAT EXHIBITION • 1851</span><h2>{winner} wins!</h2><p>Your completed locomotive arrives beneath the glass roof of Crystal Palace.</p><button onClick={onExit}>RETURN TO WORLDS</button></div>}
    </main>
  );
}
