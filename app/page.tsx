"use client";

import { useState } from "react";
import VictorianBoardFresh from "./VictorianBoardFresh";
import { themes, type ThemeId } from "./gameData";

export default function Home() {
  const [screen, setScreen] = useState<"setup" | "victorian">("setup");
  const [themeId, setThemeId] = useState<ThemeId>("victorian");
  const [names, setNames] = useState<[string, string, string]>(["Player 1", "Player 2", "Player 3"]);
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];

  if (screen === "victorian") return <VictorianBoardFresh names={names} onExit={() => setScreen("setup")} />;

  return (
    <main className="setupPage" style={{ "--accent": theme.accent, "--accent2": theme.accent2, "--surface": theme.surface, "--world": theme.backdrop, "--texture": theme.texture } as React.CSSProperties}>
      <section className="setupPanel">
        <div className="eyebrow">ASTERIA • TABLETOP AI TRIVIA</div>
        <h1>Choose your world.</h1>
        <p className="setupLead">Each world is its own board game with a unique objective, sharing the same spoken trivia engine.</p>
        <div className="themeGrid">
          {themes.map((option) => (
            <button key={option.id} className={`themeCard ${themeId === option.id ? "selected" : ""}`} onClick={() => setThemeId(option.id)} style={{ "--cardAccent": option.accent, background: option.backdrop } as React.CSSProperties}>
              <span className="themeGlyph">{option.id === "victorian" ? "♜" : option.id === "cosmic" ? "◉" : "♛"}</span>
              <strong>{option.name}</strong><small>{option.id === "victorian" ? "Build a steam locomotive and race it to the Great Exhibition of 1851." : `${option.strapline} • Game coming next.`}</small>
            </button>
          ))}
        </div>
        <div className="nameRow" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <label><span>Player one</span><input value={names[0]} onChange={(e) => setNames([e.target.value, names[1], names[2]])} /></label>
          <label><span>Player two</span><input value={names[1]} onChange={(e) => setNames([names[0], e.target.value, names[2]])} /></label>
          <label><span>Player three</span><input value={names[2]} onChange={(e) => setNames([names[0], names[1], e.target.value])} /></label>
        </div>
        <div className="setupFooter">
          <div><b>{themeId === "victorian" ? "The Great Exhibition" : theme.boardName}</b><span>{themeId === "victorian" ? "Three rival engineers travel a single railway to Crystal Palace, gathering resources and building their locomotives along the way." : "This world's unique game is not built yet."}</span></div>
          <button className="primary" disabled={themeId !== "victorian"} onClick={() => setScreen("victorian")}>{themeId === "victorian" ? "Begin the Great Exhibition" : "Coming soon"} <span>→</span></button>
        </div>
      </section>
    </main>
  );
}
