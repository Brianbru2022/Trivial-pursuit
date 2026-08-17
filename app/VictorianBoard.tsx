"use client";

import { useMemo, useState } from "react";
import Dice3D, { DiceResultIcon } from "./Dice3D";
import { componentOrder, componentRecipes, reachableSites, victorianSites, type ComponentKey, type ResourceKey } from "./victorianGame";
import styles from "./VictorianBoard.module.css";

type Player = {
  name: string;
  site: number;
  resources: Record<ResourceKey, number>;
  components: ComponentKey[];
};

type Props = { names: [string, string]; onExit: () => void };

const emptyResources = (): Record<ResourceKey, number> => ({ coal: 0, iron: 0, knowledge: 0, capital: 0 });
const symbols: Record<string, string> = { start: "⚒", coal: "◆", iron: "⚙", engineering: "⚒", university: "▤", port: "⚓", railway: "♜", event: "!", exhibition: "★" };

export default function VictorianBoard({ names, onExit }: Props) {
  const [players, setPlayers] = useState<Player[]>([
    { name: names[0] || "Player 1", site: 0, resources: emptyResources(), components: [] },
    { name: names[1] || "Player 2", site: 0, resources: emptyResources(), components: [] },
  ]);
  const [active, setActive] = useState(0);
  const [roll, setRoll] = useState<number | null>(null);
  const [targets, setTargets] = useState<number[]>([]);
  const [message, setMessage] = useState("Roll the die to begin your expedition.");
  const [winner, setWinner] = useState<string | null>(null);
  const player = players[active];
  const locomotiveReady = player.components.length === componentOrder.length;

  const canBuild = useMemo(() => componentOrder.filter((key) => {
    if (player.components.includes(key)) return false;
    const cost = componentRecipes[key].cost;
    return Object.entries(cost).every(([resource, amount]) => player.resources[resource as ResourceKey] >= (amount ?? 0));
  }), [player]);

  function finishRoll(value: number) {
    setRoll(value);
    setTargets(reachableSites(player.site, value));
    setMessage(`You rolled ${value}. Choose a highlighted railway destination.`);
  }

  function moveTo(siteId: number) {
    if (!targets.includes(siteId)) return;
    const site = victorianSites[siteId];
    const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
    const moving = next[active];
    moving.site = siteId;

    if (site.kind === "exhibition") {
      if (moving.components.length === componentOrder.length) {
        setPlayers(next); setWinner(moving.name); setMessage(`${moving.name} arrives at Crystal Palace with a complete locomotive!`); return;
      }
      setMessage("Crystal Palace is magnificent — but your locomotive is not complete. Back to the works!");
    } else if (site.kind === "event") {
      moving.resources.capital += 1;
      setMessage(`${site.name}: your investors rally. Gain 1 capital.`);
    } else if (site.reward) {
      Object.entries(site.reward).forEach(([key, amount]) => { moving.resources[key as ResourceKey] += amount ?? 0; });
      const rewardText = Object.entries(site.reward).map(([key, amount]) => `${amount} ${key}`).join(" + ");
      setMessage(`Success at ${site.name}. Gain ${rewardText}.`);
    } else {
      setMessage(`You arrive at ${site.name}.`);
    }

    setPlayers(next);
    setTargets([]);
  }

  function build(key: ComponentKey) {
    if (!canBuild.includes(key)) return;
    const next = players.map((p) => ({ ...p, resources: { ...p.resources }, components: [...p.components] }));
    const builder = next[active];
    Object.entries(componentRecipes[key].cost).forEach(([resource, amount]) => { builder.resources[resource as ResourceKey] -= amount ?? 0; });
    builder.components.push(key);
    setPlayers(next);
    setMessage(`${componentRecipes[key].name} completed in the workshop. ${builder.components.length}/6 locomotive components built.`);
  }

  function endTurn() {
    if (winner) return;
    setActive((a) => (a + 1) % 2);
    setRoll(null); setTargets([]); setMessage("Roll the die to continue the race to the Great Exhibition.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.turnPlaque}><b>{player.name}</b><span>YOUR TURN</span></div>
        <div className={styles.title}><span>1851</span><h1>THE GREAT EXHIBITION</h1><p>Build Your Locomotive • Race to London</p></div>
        <button onClick={onExit}>EXIT</button>
      </header>

      {roll !== null && <DiceResultIcon value={roll} />}

      <section className={styles.mapWrap}>
        <div className={styles.mapArt} aria-hidden="true"><div className={styles.scotland}>SCOTLAND</div><div className={styles.england}>ENGLAND</div><div className={styles.wales}>WALES</div><div className={styles.sea}>NORTH SEA</div></div>
        <svg className={styles.rails} viewBox="0 0 100 100" preserveAspectRatio="none">
          {victorianSites.flatMap((site) => site.links.filter((id) => id > site.id).map((id) => {
            const other = victorianSites[id];
            return <line key={`${site.id}-${id}`} x1={site.x} y1={site.y} x2={other.x} y2={other.y} />;
          }))}
        </svg>

        {victorianSites.map((site) => (
          <button key={site.id} className={`${styles.site} ${styles[site.kind]} ${targets.includes(site.id) ? styles.target : ""}`} style={{ left: `${site.x}%`, top: `${site.y}%` }} disabled={!targets.includes(site.id)} onClick={() => moveTo(site.id)}>
            <i>{symbols[site.kind]}</i><span>{site.shortName}</span>
          </button>
        ))}

        {players.map((p, index) => {
          const site = victorianSites[p.site];
          return <div key={index} className={`${styles.pawn} ${index === 1 ? styles.pawnTwo : ""}`} style={{ left: `${site.x}%`, top: `${site.y}%` }}>{index + 1}</div>;
        })}

        {roll === null && !winner && <Dice3D onResult={finishRoll} />}

        <aside className={styles.palace}><span>1851</span><div className={styles.palaceDrawing}>♜</div><b>CRYSTAL PALACE</b><small>LONDON</small></aside>
      </section>

      <section className={styles.workshop}>
        <div className={styles.resources}>
          <b>RESOURCES</b>
          <span>◆ Coal <strong>{player.resources.coal}</strong></span><span>⚙ Iron <strong>{player.resources.iron}</strong></span><span>▤ Knowledge <strong>{player.resources.knowledge}</strong></span><span>£ Capital <strong>{player.resources.capital}</strong></span>
        </div>
        <div className={styles.buildArea}>
          <div className={styles.workshopTitle}>THE WORKSHOP <span>Build Your Locomotive</span></div>
          <div className={styles.parts}>{componentOrder.map((key) => {
            const built = player.components.includes(key); const available = canBuild.includes(key); const recipe = componentRecipes[key];
            return <button key={key} className={`${styles.part} ${built ? styles.built : ""} ${available ? styles.available : ""}`} onClick={() => build(key)} disabled={!available || built}><div className={styles.partArt}>{key === "wheels" ? "◉◉" : key === "pistons" ? "╱╲" : key === "cab" ? "▣" : key === "tender" ? "▰" : key === "firebox" ? "▧" : "◒"}</div><b>{recipe.name}</b><small>{built ? "BUILT" : Object.entries(recipe.cost).map(([r,a]) => `${a} ${r}`).join(" • ")}</small></button>;
          })}</div>
        </div>
      </section>

      <footer className={styles.footer}><p>{message}</p><div><span>{locomotiveReady ? "✓ Locomotive complete — reach Crystal Palace!" : `${player.components.length}/6 components built`}</span>{roll !== null && targets.length === 0 && !winner && <button onClick={endTurn}>END TURN →</button>}</div></footer>
      {winner && <div className={styles.win}><span>THE GREAT EXHIBITION • 1851</span><h2>{winner} wins!</h2><p>The locomotive steams beneath the glass roof of Crystal Palace.</p><button onClick={onExit}>Return to worlds</button></div>}
    </main>
  );
}
