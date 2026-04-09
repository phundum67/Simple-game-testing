import { useEffect, useMemo, useState } from "react";
import GameCanvas from "./GameCanvas";
import { fetchCharacters, fetchLeaderboard, submitScore } from "./api";
import { mergeCharacterVisuals } from "./assets/manifest";
import { DEFAULT_CHARACTERS } from "./game/data/characters";
import { LEVELS } from "./game/data/levels";

const screenTitles = {
  menu: "Main Menu",
  select: "Character Select",
  leaderboard: "Leaderboard",
  instructions: "Instructions",
  game: "Run In Progress",
  results: "Run Summary",
};

const formatDate = (dateText) =>
  new Date(dateText).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [characters, setCharacters] = useState(DEFAULT_CHARACTERS.map(mergeCharacterVisuals));
  const [selectedCharacterId, setSelectedCharacterId] = useState(DEFAULT_CHARACTERS[0].id);
  const [leaderboard, setLeaderboard] = useState([]);
  const [apiStatus, setApiStatus] = useState("Checking backend...");
  const [boardError, setBoardError] = useState("");
  const [runKey, setRunKey] = useState(0);
  const [runResult, setRunResult] = useState(null);
  const [username, setUsername] = useState("");
  const [submitState, setSubmitState] = useState({ busy: false, error: "", saved: false });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [charactersResponse, leaderboardResponse] = await Promise.all([
          fetchCharacters(),
          fetchLeaderboard(10),
        ]);

        if (cancelled) {
          return;
        }

        const incomingCharacters = charactersResponse.characters?.length
          ? charactersResponse.characters
          : DEFAULT_CHARACTERS;
        setCharacters(incomingCharacters.map(mergeCharacterVisuals));
        setSelectedCharacterId((current) =>
          incomingCharacters.some((character) => character.id === current)
            ? current
            : incomingCharacters[0].id,
        );
        setLeaderboard(leaderboardResponse.entries ?? []);
        setApiStatus("Backend connected");
        setBoardError("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCharacters(DEFAULT_CHARACTERS.map(mergeCharacterVisuals));
        setLeaderboard([]);
        setApiStatus("Backend offline: leaderboard submission is unavailable until Flask is running.");
        setBoardError(error.message);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCharacter = useMemo(
    () =>
      characters.find((character) => character.id === selectedCharacterId) ??
      characters[0] ??
      mergeCharacterVisuals(DEFAULT_CHARACTERS[0]),
    [characters, selectedCharacterId],
  );

  const startGame = () => {
    setRunResult(null);
    setUsername("");
    setSubmitState({ busy: false, error: "", saved: false });
    setRunKey((current) => current + 1);
    setScreen("game");
  };

  const refreshLeaderboard = async () => {
    try {
      const data = await fetchLeaderboard(10);
      setLeaderboard(data.entries ?? []);
      setBoardError("");
    } catch (error) {
      setBoardError(error.message);
    }
  };

  const handleSubmitScore = async (event) => {
    event.preventDefault();
    if (!runResult) {
      return;
    }

    setSubmitState({ busy: true, error: "", saved: false });

    try {
      const data = await submitScore({
        username,
        score: runResult.score,
        characterId: runResult.characterId,
        resultType: runResult.outcome,
        stats: {
          coins: runResult.coins,
          enemiesDefeated: runResult.enemiesDefeated,
          sideQuestsCompleted: runResult.sideQuestsCompleted,
          levelsCleared: runResult.levelsCleared,
          boxesOpened: runResult.boxesOpened,
          timeSeconds: runResult.timeSeconds,
        },
      });

      setLeaderboard(data.entries ?? []);
      setSubmitState({ busy: false, error: "", saved: true });
      setApiStatus("Backend connected");
    } catch (error) {
      setSubmitState({ busy: false, error: error.message, saved: false });
    }
  };

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <header className="topbar">
        <div>
          <p className="eyebrow">Original browser platformer</p>
          <h1>Chaos Runner</h1>
          <p className="tagline">
            Sprint through neon rooftops, weird dream soup, jungle ruins, and a glitch palace while chasing a leaderboard score.
          </p>
        </div>

        <div className="status-card">
          <span className="status-pill">{screenTitles[screen]}</span>
          <p>{apiStatus}</p>
          <strong>{selectedCharacter.name}</strong>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel hero-panel">
          {screen === "menu" && (
            <div className="stack">
              <div className="hero-copy">
                <span className="hero-badge">Arcade run + leaderboard competition</span>
                <h2>Chaotic, colorful, and built to be easy to study later.</h2>
                <p>
                  Pick a weird original hero, crack mystery boxes for buffs, chase side quests,
                  and post a score to the online board after the run ends.
                </p>
              </div>

              <div className="button-grid">
                <button className="primary-button" type="button" onClick={startGame}>
                  Start Game
                </button>
                <button className="secondary-button" type="button" onClick={() => setScreen("select")}>
                  Character Select
                </button>
                <button className="secondary-button" type="button" onClick={() => setScreen("leaderboard")}>
                  View Leaderboard
                </button>
                <button className="secondary-button" type="button" onClick={() => setScreen("instructions")}>
                  Instructions
                </button>
              </div>

              <div className="feature-grid">
                <article className="mini-card">
                  <h3>Level Themes</h3>
                  <p>Neon city, dream world, jungle ruins, and glitch world.</p>
                </article>
                <article className="mini-card">
                  <h3>Mystery Boxes</h3>
                  <p>Speed boost, shield, double points, enemy freeze, and extra jump.</p>
                </article>
                <article className="mini-card">
                  <h3>Side Quests</h3>
                  <p>Hidden relics, enemy defeat goals, and secret rooms add bonus score.</p>
                </article>
              </div>
            </div>
          )}

          {screen === "select" && (
            <div className="stack">
              <div className="section-heading">
                <h2>Choose Your Chaos Gremlin</h2>
                <p>Each original hero has one beginner-friendly passive ability.</p>
              </div>

              <div className="character-grid">
                {characters.map((character) => {
                  const isSelected = character.id === selectedCharacterId;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={`character-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedCharacterId(character.id)}
                      style={{
                        "--hero-frame": character.visuals?.frame ?? character.accent,
                        "--hero-glow": character.visuals?.glow ?? "rgba(255,255,255,0.18)",
                      }}
                    >
                      <div className="character-art-frame">
                        <img className="character-portrait" src={character.visuals?.portrait} alt={`${character.name} portrait`} />
                      </div>
                      <div className="stack-tight">
                        <strong>{character.name}</strong>
                        <span className="card-subtitle">{character.title}</span>
                        <p>{character.description}</p>
                        <span className="ability-chip">
                          {character.visuals?.icon && (
                            <img className="ability-icon" src={character.visuals.icon} alt="" aria-hidden="true" />
                          )}
                          {character.ability.name}
                        </span>
                        <small>{character.ability.description}</small>
                      </div>
                      <div className="select-strip">Select</div>
                    </button>
                  );
                })}
              </div>

              <div className="inline-actions">
                <button className="primary-button" type="button" onClick={startGame}>
                  Start With {selectedCharacter.name}
                </button>
                <button className="ghost-button" type="button" onClick={() => setScreen("menu")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {screen === "leaderboard" && (
            <div className="stack">
              <div className="section-heading">
                <h2>Online Leaderboard</h2>
                <p>Top runs are saved by the Flask backend and stored in SQLite.</p>
              </div>

              {boardError && <div className="notice warning">{boardError}</div>}

              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Character</th>
                      <th>Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan="5">Start the backend to load leaderboard data.</td>
                      </tr>
                    ) : (
                      leaderboard.map((entry) => (
                        <tr key={`${entry.id}-${entry.rank}`}>
                          <td>#{entry.rank}</td>
                          <td>{entry.username}</td>
                          <td>{entry.characterName}</td>
                          <td>{entry.score}</td>
                          <td>{formatDate(entry.date)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="inline-actions">
                <button className="secondary-button" type="button" onClick={refreshLeaderboard}>
                  Refresh
                </button>
                <button className="ghost-button" type="button" onClick={() => setScreen("menu")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {screen === "instructions" && (
            <div className="stack">
              <div className="section-heading">
                <h2>How To Play</h2>
                <p>The controls are simple, but the run rewards speed, routing, and side-quest awareness.</p>
              </div>

              <div className="instruction-grid">
                <article className="mini-card">
                  <h3>Controls</h3>
                  <p>Move with arrow keys or A/D. Jump with Space, W, or Up. Press P or Escape to pause.</p>
                </article>
                <article className="mini-card">
                  <h3>Score Formula</h3>
                  <p>Coins, enemy stomps, level clears, time left, mystery boxes, and quest bonuses all add score.</p>
                </article>
                <article className="mini-card">
                  <h3>Optional Quests</h3>
                  <p>Hidden relics, enemy defeat goals, secret rooms, and time challenges award bonus points.</p>
                </article>
                <article className="mini-card">
                  <h3>Enemy Types</h3>
                  <p>Walkers patrol, flyers drift, chasers hunt nearby players, and mini-bosses take multiple hits.</p>
                </article>
              </div>

              <div className="notice">
                Mystery boxes are solid blocks. Jump into them from below to trigger a random buff.
              </div>

              <button className="ghost-button" type="button" onClick={() => setScreen("menu")}>
                Back
              </button>
            </div>
          )}

          {screen === "game" && (
            <GameCanvas
              key={runKey}
              character={selectedCharacter}
              levels={LEVELS}
              onFinish={(result) => {
                setRunResult(result);
                setScreen("results");
              }}
              onExit={() => setScreen("menu")}
            />
          )}

          {screen === "results" && runResult && (
            <div className="stack">
              <div className="section-heading">
                <h2>{runResult.outcome === "win" ? "Run Cleared" : "Game Over"}</h2>
                <p>
                  {runResult.characterName} finished with {runResult.score} points.
                </p>
              </div>

              <div className="selected-character-art">
                <img
                  className="selected-character-sprite"
                  src={selectedCharacter.visuals?.sprite}
                  alt={`${selectedCharacter.name} in-game sprite`}
                />
              </div>

              <div className="stats-grid">
                <article className="stat-card">
                  <span>Score</span>
                  <strong>{runResult.score}</strong>
                </article>
                <article className="stat-card">
                  <span>Coins</span>
                  <strong>{runResult.coins}</strong>
                </article>
                <article className="stat-card">
                  <span>Enemies</span>
                  <strong>{runResult.enemiesDefeated}</strong>
                </article>
                <article className="stat-card">
                  <span>Quests</span>
                  <strong>{runResult.sideQuestsCompleted}</strong>
                </article>
              </div>

              <form className="submit-card" onSubmit={handleSubmitScore}>
                <label htmlFor="username">Save this score to the online leaderboard</label>
                <div className="submit-row">
                  <input
                    id="username"
                    maxLength="20"
                    placeholder="Enter username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  <button className="primary-button" type="submit" disabled={submitState.busy}>
                    {submitState.busy ? "Saving..." : "Submit Score"}
                  </button>
                </div>
                {submitState.error && <p className="error-text">{submitState.error}</p>}
                {submitState.saved && <p className="success-text">Score saved. Check the leaderboard for your rank.</p>}
              </form>

              <div className="inline-actions">
                <button className="primary-button" type="button" onClick={startGame}>
                  Play Again
                </button>
                <button className="secondary-button" type="button" onClick={() => setScreen("leaderboard")}>
                  View Leaderboard
                </button>
                <button className="ghost-button" type="button" onClick={() => setScreen("menu")}>
                  Main Menu
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="panel sidebar-panel">
          <div className="stack">
            <div className="section-heading">
              <h2>Current Hero</h2>
              <p>Character ability applies automatically during the run.</p>
            </div>

            <div className="selected-character-card">
              <div
                className="selected-character-glow"
                style={{ background: `linear-gradient(135deg, ${selectedCharacter.color}, ${selectedCharacter.accent})` }}
              />
              <div className="selected-character-art">
                <img
                  className="selected-character-sprite"
                  src={selectedCharacter.visuals?.sprite}
                  alt={`${selectedCharacter.name} sprite reference`}
                />
              </div>
              <div className="stack-tight">
                <strong>{selectedCharacter.name}</strong>
                <span className="card-subtitle">{selectedCharacter.title}</span>
                <p>{selectedCharacter.description}</p>
                <span className="ability-chip">
                  {selectedCharacter.visuals?.icon && (
                    <img className="ability-icon" src={selectedCharacter.visuals.icon} alt="" aria-hidden="true" />
                  )}
                  {selectedCharacter.ability.name}
                </span>
                <small>{selectedCharacter.ability.description}</small>
              </div>
            </div>

            <div className="mini-card">
              <h3>Score Tips</h3>
              <p>
                Stomp enemies instead of tanking damage, keep an eye on time limits, and open boxes
                for score multipliers before grabbing big coin lines.
              </p>
            </div>

            <div className="mini-card">
              <h3>Tech Stack</h3>
              <p>React + Canvas on the frontend. Flask + SQLite + Flask-CORS on the backend.</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
