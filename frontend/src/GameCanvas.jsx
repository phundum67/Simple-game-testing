import { useEffect, useRef, useState } from "react";
import { createSoundBus } from "./game/audio";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./game/constants";
import { createGame, drawGame, getGameSnapshot, stepGame, togglePause } from "./game/engine";

const initialTouchState = {
  left: false,
  right: false,
  jumpQueued: false,
};

export default function GameCanvas({ character, levels, onFinish, onExit }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef(initialTouchState);
  const resultSentRef = useRef(false);
  const soundRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    soundRef.current = createSoundBus();
    gameRef.current = createGame(levels, character);
    setSnapshot(getGameSnapshot(gameRef.current));

    const ctx = canvasRef.current.getContext("2d");
    let lastTime = performance.now();
    let lastHudUpdate = 0;

    const loop = (now) => {
      const game = gameRef.current;
      if (!game) {
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      stepGame(
        game,
        {
          left: keysRef.current.left,
          right: keysRef.current.right,
          jumpPressed: keysRef.current.jumpQueued,
        },
        dt,
        soundRef.current,
      );
      keysRef.current.jumpQueued = false;

      drawGame(ctx, game);

      if (now - lastHudUpdate > 100) {
        setSnapshot(getGameSnapshot(game));
        lastHudUpdate = now;
      }

      if (!resultSentRef.current && (game.status === "won" || game.status === "lost")) {
        resultSentRef.current = true;
        onFinish(game.result);
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [character, levels, onFinish]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) {
        keysRef.current.left = true;
      }

      if (["ArrowRight", "d", "D"].includes(event.key)) {
        keysRef.current.right = true;
      }

      if (["ArrowUp", "w", "W", " "].includes(event.key)) {
        keysRef.current.jumpQueued = true;
      }

      if (["p", "P", "Escape"].includes(event.key) && gameRef.current) {
        togglePause(gameRef.current);
      }
    };

    const handleKeyUp = (event) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) {
        keysRef.current.left = false;
      }

      if (["ArrowRight", "d", "D"].includes(event.key)) {
        keysRef.current.right = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const touchStart = (direction) => {
    soundRef.current?.unlock();
    if (direction === "jump") {
      keysRef.current.jumpQueued = true;
      return;
    }
    keysRef.current[direction] = true;
  };

  const touchEnd = (direction) => {
    if (direction !== "jump") {
      keysRef.current[direction] = false;
    }
  };

  return (
    <section className="game-shell">
      <div className="game-header-row">
        <div>
          <p className="eyebrow">Now playing</p>
          <div className="hero-inline">
            {character.visuals?.icon && (
              <img className="hero-inline-icon" src={character.visuals.icon} alt="" aria-hidden="true" />
            )}
            <h2>{character.name}</h2>
          </div>
          <p className="subtle-text">{character.ability.description}</p>
        </div>
        <div className="game-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              soundRef.current?.unlock();
              if (gameRef.current) {
                togglePause(gameRef.current);
                setSnapshot(getGameSnapshot(gameRef.current));
              }
            }}
          >
            Pause
          </button>
          <button className="ghost-button" type="button" onClick={onExit}>
            Leave Run
          </button>
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          className="game-canvas"
          onPointerDown={() => soundRef.current?.unlock()}
        />
      </div>

      <div className="touch-controls">
        <button
          className="control-button"
          type="button"
          onPointerDown={() => touchStart("left")}
          onPointerUp={() => touchEnd("left")}
          onPointerLeave={() => touchEnd("left")}
        >
          Left
        </button>
        <button className="control-button" type="button" onPointerDown={() => touchStart("jump")}>
          Jump
        </button>
        <button
          className="control-button"
          type="button"
          onPointerDown={() => touchStart("right")}
          onPointerUp={() => touchEnd("right")}
          onPointerLeave={() => touchEnd("right")}
        >
          Right
        </button>
      </div>

      {snapshot && (
        <div className="game-legend">
          <div className="legend-card">
            <span className="legend-label">Level</span>
            <strong>
              {snapshot.levelIndex}/{snapshot.levelCount}
            </strong>
          </div>
          <div className="legend-card">
            <span className="legend-label">Score</span>
            <strong>{snapshot.score}</strong>
          </div>
          <div className="legend-card">
            <span className="legend-label">Time Left</span>
            <strong>{snapshot.timeLeft}s</strong>
          </div>
        </div>
      )}
    </section>
  );
}
