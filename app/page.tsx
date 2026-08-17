export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="badge">TABLET-FIRST • AI TRIVIA</div>
        <h1>Trivial Pursuit AI</h1>
        <p className="lead">The board is ready. Next we’ll build the full two-player game, categories, animated board and AI question engine.</p>
        <div className="players">
          <div className="player"><span>Player 1</span><strong>Ready</strong></div>
          <div className="vs">VS</div>
          <div className="player"><span>Player 2</span><strong>Ready</strong></div>
        </div>
        <button type="button">Game setup coming next</button>
      </section>
    </main>
  );
}
