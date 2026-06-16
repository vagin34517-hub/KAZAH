import { useEffect, useRef, useState } from "react"
import { api, type Player, type HistoryItem } from "./api"

type Phase = "waiting" | "running" | "crashed"

const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? ""

export function CrashGame() {
  const [phase, setPhase] = useState<Phase>("waiting")
  const [multiplier, setMultiplier] = useState(1.0)
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState("")
  const wsRef = useRef<WebSocket | null>(null)

  // Initial data load.
  useEffect(() => {
    api.history().then((r) => setHistory(r.items)).catch(() => {})
    api.players().then((r) => setPlayers(r.players)).catch(() => {})
  }, [])

  // WebSocket connect.
  useEffect(() => {
    if (!WS_URL) return
    let ws: WebSocket | null = null
    let reconnectTimer: any = null
    function connect() {
      try {
        ws = new WebSocket(WS_URL)
        wsRef.current = ws
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === "tick") {
            setPhase("running")
            setMultiplier(msg.multiplier)
          } else if (msg.type === "crash") {
            setPhase("crashed")
            setMultiplier(msg.crashPoint)
            setBetId(null)
            // Reload history + players after round.
            api.history().then((r) => setHistory(r.items)).catch(() => {})
            api.players().then((r) => setPlayers(r.players)).catch(() => {})
          } else if (msg.type === "waiting") {
            setPhase("waiting")
            setMultiplier(1.0)
            api.players().then((r) => setPlayers(r.players)).catch(() => {})
          } else if (msg.type === "players") {
            setPlayers(msg.players)
          }
        }
        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 2000)
        }
      } catch {}
    }
    connect()
    return () => {
      clearTimeout(reconnectTimer)
      try { ws?.close() } catch {}
    }
  }, [])

  async function onMainAction() {
    if (phase === "waiting" && !betId) {
      try {
        const r = await api.placeBet(bet)
        setBetId(r.betId)
        setMessage(`Ставка ${bet} TON принята`)
      } catch {
        setMessage("Ошибка ставки")
      }
    } else if (phase === "running" && betId) {
      try {
        const r = await api.cashout(betId)
        setMessage(`Выведено: ${r.payout.toFixed(2)} TON`)
        setBetId(null)
      } catch {
        setMessage("Не успел вывести")
      }
    }
  }

  const buttonLabel =
    betId && phase === "running"
      ? `Забрать ${(bet * multiplier).toFixed(2)} TON`
      : "Сделать ставку"

  return (
    <div className="crash-screen">
      <div className="sky">
        <div className="stars" />
        <div className={`rocket ${phase}`}>🚀</div>
        <div className={`multiplier-overlay ${phase}`}>
          {phase === "crashed" ? `Краш ${multiplier.toFixed(2)}x` : `${multiplier.toFixed(2)}x`}
        </div>
      </div>

      <div className="history-strip">
        {history.slice(0, 8).map((h, i) => (
          <div
            key={h.roundId + i}
            className={`pill ${h.crashPoint >= 2 ? "win" : h.crashPoint >= 1.5 ? "mid" : "low"}`}
          >
            x{h.crashPoint.toFixed(2)}
          </div>
        ))}
        {history.length === 0 && (
          <div className="pill low">x1.00</div>
        )}
      </div>

      <div className="bet-controls">
        <div className="bet-row">
          <button className="bet-step" onClick={() => setBet((b) => Math.max(0.1, +(b - 0.5).toFixed(2)))} disabled={!!betId}>−</button>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={bet}
            disabled={!!betId}
            onChange={(e) => setBet(Number(e.target.value))}
          />
          <button className="bet-step" onClick={() => setBet((b) => +(b + 0.5).toFixed(2))} disabled={!!betId}>+</button>
        </div>
        <button
          className={`main-action ${phase === "running" && betId ? "cashout" : ""}`}
          onClick={onMainAction}
          disabled={(phase === "waiting" && !!betId) || (phase === "crashed")}
        >
          {buttonLabel}
        </button>
        {message && <div className="message">{message}</div>}
      </div>

      <div className="players-list">
        {players.length === 0 && <div className="empty">Пока никто не играет</div>}
        {players.map((p) => (
          <div key={p.userId + ":" + p.bet} className={`player-row ${p.status}`}>
            <div className="avatar">{(p.name || "?").slice(0, 1)}</div>
            <div className="player-info">
              <div className="player-name">{p.name}</div>
              <div className="player-bet">
                💎 {p.bet.toFixed(2)}
                {p.multiplier ? <span className="x"> ×{p.multiplier.toFixed(2)}</span> : null}
              </div>
            </div>
            <div className="player-result">
              {p.status === "cashed" && p.payout != null && (
                <span className="win-tag">💎 {p.payout.toFixed(2)}</span>
              )}
              {p.status === "lost" && <span className="lost-tag">—</span>}
              {p.status === "playing" && <span className="playing-tag">🔴</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
