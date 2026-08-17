"use client";

import { useMemo, useRef, useState } from "react";
import Dice3D from "./Dice3D";
import {
  boardNodes,
  categories,
  getQuestion,
  getReachable,
  getTheme,
  themes,
  type CategoryId,
  type Question,
  type ThemeId,
} from "./gameData";

type Player = { name: string; node: number; score: number; relics: CategoryId[] };
type Phase = "roll" | "move" | "question" | "result" | "finished";
type Verdict = { correct: boolean; label: string } | null;

function normalise(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b(the|a|an|sir|king|mount|mt)\b/g, " ").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function judgeLocally(spoken: string, question: Question): Verdict {
  const candidate = normalise(spoken);
  const accepted = [question.answer, ...(question.alternatives ?? [])].map(normalise);
  if (!candidate) return { correct: false, label: "I didn't catch an answer." };
  if (accepted.some((item) => candidate === item)) return { correct: true, label: "Exact meaning recognised" };
  if (accepted.some((item) => item.length > 3 && (candidate.includes(item) || item.includes(candidate)))) return { correct: true, label: "Equivalent answer recognised" };
  if (accepted.some((item) => item.length >= 6 && levenshtein(candidate, item) <= 2)) return { correct: true, label: "Pronunciation/transcription variation accepted" };
  return { correct: false, label: "Not matched with enough confidence" };
}

export default function Home() {
  const [screen, setScreen] = useState<"setup" | "game">("setup");
  const [themeId, setThemeId] = useState<ThemeId>("victorian");
  const [names, setNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [players, setPlayers] = useState<Player[]>([
    { name: "Player 1", node: 7, score: 0, relics: [] },
    { name: "Player 2", node: 13, score: 0, relics: [] },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("roll");
  const [roll, setRoll] = useState<number | null>(null);
  const [reachable, setReachable] = useState<number[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [listening, setListening] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [lastReward, setLastReward] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const theme = getTheme(themeId);
  const activePlayer = players[activeIndex];
  const currentNode = boardNodes[activePlayer.node];
  const cssVars = useMemo(() => ({
    "--accent": theme.accent,
    "--accent2": theme.accent2,
    "--surface": theme.surface,
    "--world": theme.backdrop,
    "--texture": theme.texture,
  }) as React.CSSProperties, [theme]);

  function startGame() {
    setPlayers([
      { name: names[0].trim() || "Player 1", node: 7, score: 0, relics: [] },
      { name: names[1].trim() || "Player 2", node: 13, score: 0, relics: [] },
    ]);
    setActiveIndex(0);
    setUsedQuestions([]);
    setWinner(null);
    setPhase("roll");
    setRoll(null);
    setScreen("game");
  }

  function completeDiceRoll(value: number) {
    const targets = getReachable(activePlayer.node, value).filter((id) => id !== 0 || activePlayer.relics.length >= 4);
    setRoll(value);
    setReachable(targets);
    setPhase("move");
  }

  function selectDestination(nodeId: number) {
    if (!reachable.includes(nodeId)) return;
    const destination = boardNodes[nodeId];
    const nextPlayers = [...players];
    nextPlayers[activeIndex] = { ...activePlayer, node: nodeId };
    setPlayers(nextPlayers);
    const nextQuestion = getQuestion(destination.category, usedQuestions);
    setUsedQuestions((prev) => [...prev, nextQuestion.id]);
    setQuestion(nextQuestion);
    setAnswer("");
    setVerdict(null);
    setLastReward(null);
    setPhase("question");
    window.setTimeout(() => speakQuestion(nextQuestion), 350);
  }

  function speakQuestion(q = question) {
    if (!q || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const intro = new SpeechSynthesisUtterance(`${activePlayer.name}. ${categories[q.category].name}. ${q.question}`);
    intro.lang = "en-GB";
    intro.rate = 0.94;
    intro.pitch = themeId === "cosmic" ? 1.05 : 0.96;
    window.speechSynthesis.speak(intro);
  }

  function listenForAnswer() {
    if (typeof window === "undefined") return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setVerdict({ correct: false, label: "Speech recognition is unavailable in this browser — type the answer instead." });
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.onresult = (event: any) => {
      const finalResult = event.results[event.results.length - 1];
      setAnswer(finalResult[0]?.transcript ?? "");
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function submitAnswer(forceCorrect = false) {
    if (!question) return;
    const result = forceCorrect ? { correct: true, label: "Accepted by the players" } : judgeLocally(answer, question);
    setVerdict(result);
    if (!result.correct) { setPhase("result"); return; }

    const destination = boardNodes[players[activeIndex].node];
    const riskBonus = destination.kind === "risk" ? 100 : 0;
    const base = destination.id === 0 ? 300 : 100;
    const nextPlayers = [...players];
    const current = nextPlayers[activeIndex];
    let relics = [...current.relics];
    let rewardText = `${base + riskBonus} points`;

    if (destination.kind === "category" && destination.category !== "wildcard" && !relics.includes(destination.category)) {
      relics = [...relics, destination.category];
      rewardText = `${base + riskBonus} points + ${categories[destination.category].name} ${theme.rewardName}`;
    }

    nextPlayers[activeIndex] = { ...current, score: current.score + base + riskBonus, relics };
    setPlayers(nextPlayers);
    setLastReward(rewardText);

    if (destination.id === 0 && current.relics.length >= 4) {
      setWinner(current.name);
      setPhase("finished");
    } else {
      setPhase("result");
    }
  }

  function endTurn() {
    setActiveIndex((index) => (index + 1) % 2);
    setRoll(null);
    setReachable([]);
    setQuestion(null);
    setAnswer("");
    setVerdict(null);
    setLastReward(null);
    setPhase("roll");
  }

  if (screen === "setup") {
    return (
      <main className="setupPage" style={cssVars}>
        <section className="setupPanel">
          <div className="eyebrow">ASTERIA • TABLETOP AI TRIVIA</div>
          <h1>Choose your world.</h1>
          <p className="setupLead">The theme changes the board, atmosphere, host and rewards — not the breadth of the trivia.</p>
          <div className="themeGrid">
            {themes.map((option) => (
              <button key={option.id} className={`themeCard ${themeId === option.id ? "selected" : ""}`} onClick={() => setThemeId(option.id)} style={{ "--cardAccent": option.accent, background: option.backdrop } as React.CSSProperties}>
                <span className="themeGlyph">{option.id === "victorian" ? "✥" : option.id === "cosmic" ? "◉" : "♜"}</span>
                <strong>{option.name}</strong><small>{option.strapline}</small>
              </button>
            ))}
          </div>
          <div className="nameRow">
            <label><span>Player one</span><input value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} /></label>
            <div className="versus">VS</div>
            <label><span>Player two</span><input value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} /></label>
          </div>
          <div className="setupFooter">
            <div><b>{theme.boardName}</b><span>Collect 4 knowledge {theme.rewardName}s, then reach the centre and survive the finale.</span></div>
            <button className="primary" onClick={startGame}>Enter the board <span>→</span></button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="gamePage" style={cssVars}>
      <div className="worldTexture" />
      <header className="topBar">
        <div><span className="eyebrow">{theme.name}</span><h2>{theme.boardName}</h2></div>
        <div className="hostPill"><span className="hostOrb">✦</span><div><small>YOUR HOST</small><b>{theme.hostName}</b></div></div>
        <button className="quiet" onClick={() => setScreen("setup")}>New game</button>
      </header>

      <section className="tableLayout">
        <aside className="playerRail leftRail"><PlayerPanel player={players[0]} active={activeIndex === 0} themeReward={theme.rewardName} /></aside>
        <div className="boardStage">
          <div className="boardHalo" />
          <div className="board">
            <svg className="routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {boardNodes.flatMap((node) => node.links.filter((to) => to > node.id).map((to) => {
                const other = boardNodes[to];
                const live = reachable.includes(node.id) || reachable.includes(to);
                return <line key={`${node.id}-${to}`} x1={node.x} y1={node.y} x2={other.x} y2={other.y} className={live ? "route live" : "route"} />;
              }))}
            </svg>

            <div className="boardTitle"><span>{activePlayer.name}&apos;s turn</span><b>{phase === "roll" ? "Tap the die to begin" : phase === "move" ? `Rolled ${roll} — choose your destination` : "Knowledge decides what happens next"}</b></div>

            {boardNodes.map((node) => {
              const category = categories[node.category];
              const isTarget = reachable.includes(node.id);
              const locked = node.id === 0 && activePlayer.relics.length < 4;
              return (
                <button key={node.id} className={`boardNode ${node.kind} ${isTarget ? "target" : ""} ${locked ? "locked" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, "--nodeColor": category.color } as React.CSSProperties} disabled={phase !== "move" || !isTarget} onClick={() => selectDestination(node.id)} aria-label={node.label}>
                  <span>{node.id === 0 ? "✦" : category.symbol}</span>
                  <small>{node.id === 0 ? (locked ? "LOCKED" : "FINALE") : node.kind === "risk" ? "×2" : node.kind === "portal" ? "↯" : ""}</small>
                </button>
              );
            })}

            {players.map((player, index) => {
              const node = boardNodes[player.node];
              return <div key={player.name + index} className={`pawn pawn${index + 1} ${activeIndex === index ? "active" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} title={player.name}><span>{index + 1}</span></div>;
            })}

            {phase === "roll" && <Dice3D onResult={completeDiceRoll} />}
          </div>
        </div>

        <aside className="playerRail rightRail">
          <PlayerPanel player={players[1]} active={activeIndex === 1} themeReward={theme.rewardName} />
          <div className="legendCard">
            <span className="eyebrow">BOARD KEY</span>
            <p><i className="keyDot riskDot" /> High-stakes space: +100 bonus points.</p>
            <p><i className="keyDot portalDot" /> Passage: jumps between distant routes.</p>
            <p><i className="keyDot finalDot" /> Centre unlocks after 4 different rewards.</p>
          </div>
        </aside>
      </section>

      {question && (phase === "question" || phase === "result" || phase === "finished") && (
        <div className="questionScrim">
          <article className="questionCard">
            <div className="questionArt" aria-hidden="true">
              <div className="artFrame"><span>{categories[question.category].symbol}</span><b>{categories[question.category].neutralArt}</b><small>{question.artCue}</small></div>
              <div className="spoilerSeal">SPOILER-SAFE ART</div>
            </div>
            <div className="questionBody">
              <div className="questionMeta"><span style={{ color: categories[question.category].color }}>{categories[question.category].name}</span><span>Difficulty {question.difficulty}/5</span><span>{currentNode.kind === "risk" ? "High stakes • +100" : "Standard challenge"}</span></div>
              <h3>{question.question}</h3>
              {phase === "question" ? (
                <>
                  <div className="answerBox">
                    <input autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAnswer()} placeholder="Say it or type it…" />
                    <button className={`micButton ${listening ? "listening" : ""}`} onClick={listenForAnswer}>{listening ? "● Listening" : "◉ Speak answer"}</button>
                  </div>
                  <div className="questionActions"><button className="secondary" onClick={() => speakQuestion()}>↻ Hear again</button><button className="primary" onClick={() => submitAnswer()}>Lock answer</button></div>
                  <p className="voiceNote">Speech is matched tolerantly for transcription and pronunciation differences. Ambiguous rulings can be overridden by the players.</p>
                </>
              ) : (
                <div className={`resultPanel ${verdict?.correct ? "correct" : "incorrect"}`}>
                  <div className="resultFlag">{verdict?.correct ? "✓ CORRECT" : "× NOT MATCHED"}</div>
                  <p className="judgeLine">{verdict?.label}</p>
                  <div className="answerReveal"><small>ANSWER</small><b>{question.answer}</b></div>
                  <p>{question.explanation}</p>
                  {lastReward && <div className="rewardToast">✦ {lastReward}</div>}
                  {!verdict?.correct && phase !== "finished" && <button className="overrideButton" onClick={() => submitAnswer(true)}>We meant that — accept answer</button>}
                  {phase !== "finished" && <button className="primary wide" onClick={endTurn}>Pass to {players[(activeIndex + 1) % 2].name} →</button>}
                </div>
              )}
            </div>
          </article>
          {phase === "finished" && (
            <div className="winnerOverlay"><span>THE ARCHIVE OPENS</span><h2>{winner} wins</h2><p>{theme.finaleName} yields its final secret.</p><button className="primary" onClick={() => setScreen("setup")}>Play another world</button></div>
          )}
        </div>
      )}
    </main>
  );
}

function PlayerPanel({ player, active, themeReward }: { player: Player; active: boolean; themeReward: string }) {
  return (
    <section className={`playerPanel ${active ? "active" : ""}`}>
      <div className="playerTop"><span className="playerToken">{player.name.slice(0, 1).toUpperCase()}</span><div><small>{active ? "CURRENT PLAYER" : "WAITING"}</small><h3>{player.name}</h3></div></div>
      <div className="score"><b>{player.score}</b><span>points</span></div>
      <div className="relicHeader"><span>{themeReward}s</span><b>{player.relics.length}/4</b></div>
      <div className="relicGrid">
        {(["history", "science", "world", "culture", "nature"] as CategoryId[]).map((id) => (
          <div key={id} className={`relic ${player.relics.includes(id) ? "won" : ""}`} style={{ "--relicColor": categories[id].color } as React.CSSProperties} title={categories[id].name}>{categories[id].symbol}</div>
        ))}
      </div>
    </section>
  );
}
