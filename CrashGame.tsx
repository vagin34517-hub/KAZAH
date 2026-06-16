import { useEffect, useRef, useState } from "react"
import { api, deriveWsUrl, type Player, type HistoryItem } from "./api"
import { useT } from "./i18n"
import { haptic } from "./telegram"

type Phase = "waiting" | "running" | "crashed"

const WS_URL = deriveWsUrl()
const SKIN_EMOJI: Record<string, string> = {
  rocket: "🚀", ufo: "🛸", plane: "✈️", helicopter: "🚁",
  satellite: "🛰️", meteor: "☄️", alien: "👽", fire: "🔥", star: "⭐",
}

function pillColor(x: number) {
  if (x < 1.5) return "blue"
  if (x < 2) return "cyan"
  if (x < 5) return "green"
  if (x < 10) return "yellow"
  return "purple"
}

export function CrashGame({ skin, bg }: { skin: string; bg: string }) {
  const { t } = useT()
  const [phase, setPhase] = useState<Phase>("waiting")
  const [multiplier, setMultiplier] = useState(1.0)
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState("")
  const [waitingEndsAt, setWaitingEndsAt] = useState<number>(Date.now() + 10000)
  const [now, setNow] = useState(Date.now())
  const [floatT, setFloatT] = useState(0)
  const phaseRef = useRef<Phase>("waiting")
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Continuous animation tick: bobbing + countdown updates at 60fps.
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const loop = (n: number) => {
      setFloatT((n - start) / 1000)
      setNow(Date.now())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    api.history().then((r) => setHistory(r.items)).catch(() => {})
    api.players().then((r) => setPlayers(r.players)).catch(() => {})
  }, [])

  // WS connect with polling fallback. Rocket always animates.
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnect: any = null
    let pollTimer: any = null
    let wsAlive = false
    let lastPhase: Phase = "waiting"

    function applyState(s: any) {
      if (s.phase !== lastPhase) {
        if (s.phase === "crashed") haptic("error")
        if (s.phase === "waiting") setBetId(null)
        lastPhase = s.phase
        if (s.phase === "waiting" || s.phase === "crashed") {
          api.history().then((r) => setHistory(r.items)).catch(() => {})
        }
      }
      setPhase(s.phase)
      setMultiplier(s.phase === "crashed" && s.crashPoint ? s.crashPoint : s.multiplier)
      if (s.waitingEndsAt) setWaitingEndsAt(s.waitingEndsAt)
      if (s.players) setPlayers(s.players)
    }

    function startPolling() {
      if (pollTimer) return
      const tick = () => {
        if (wsAlive) { pollTimer = null; return }
        api.state()
          .then((s) => applyState(s as any))
          .catch(() => {})
          .finally(() => { pollTimer = setTimeout(tick, 350) })
      }
      tick()
    }

    function connect() {
      if (!WS_URL) { startPolling(); return }
      try {
        ws = new WebSocket(WS_URL)
        ws.onopen = () => { wsAlive = true; if (pollTimer) { clearTimeout(pollTimer); pollTimer = null } }
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === "tick") { setPhase("running"); setMultiplier(msg.multiplier); lastPhase = "running" }
          else if (msg.type === "running") { setPhase("running"); if (msg.multiplier) setMultiplier(msg.multiplier); lastPhase = "running" }
          else if (msg.type === "crash") {
            setPhase("crashed"); setMultiplier(msg.crashPoint); setBetId(null); haptic("error"); lastPhase = "crashed"
            api.history().then((r) => setHistory(r.items)).catch(() => {})
            api.players().then((r) => setPlayers(r.players)).catch(() => {})
          }
          else if (msg.type === "waiting") {
            setPhase("waiting"); setMultiplier(1.0); setBetId(null); lastPhase = "waiting"
            if (msg.waitingEndsAt) setWaitingEndsAt(msg.waitingEndsAt)
            api.players().then((r) => setPlayers(r.players)).catch(() => {})
          }
          else if (msg.type === "players") setPlayers(msg.players)
        }
        ws.onclose = () => {
          wsAlive = false
          startPolling()
          reconnect = setTimeout(connect, 3000)
        }
        ws.onerror = () => { wsAlive = false; startPolling() }
      } catch { startPolling() }
    }
    connect()
    const guard = setTimeout(() => { if (!wsAlive) startPolling() }, 1500)
    return () => {
      clearTimeout(reconnect); clearTimeout(pollTimer); clearTimeout(guard)
      try { ws?.close() } catch {}
    }
  }, [])

  async function onMainAction() {
    haptic("medium")
    if (phase === "waiting" && !betId) {
      try {
        const r = await api.placeBet(bet)
        setBetId(r.betId); setMessage(`${t("bet_accepted")} · ${bet} TON`)
      } catch (e: any) { setMessage(e.message || t("bet_error")); haptic("error") }
    } else if (phase === "running" && betId) {
      try {
        const r = await api.cashout(betId)
        setMessage(`${t("withdrew")}: ${r.payout.toFixed(2)} TON`)
        setBetId(null); haptic("success")
      } catch { setMessage(t("too_late")); haptic("error") }
    }
  }

  // Countdown
  const msLeft = Math.max(0, waitingEndsAt - now)
  const secLeft = Math.ceil(msLeft / 1000)
  const countdownProgress = Math.max(0, Math.min(1, msLeft / 10000))

  // Rocket position along curve.
  const m = multiplier
  const progress = Math.min(1, Math.log(Math.max(1, m)) / Math.log(20))
  // During waiting: rocket sits at launch pad (bottom-left), wobbling.
  // During running: rocket flies along arc.
  // During crashed: rocket flies off-screen up-right.
  let rocketX: number, rocketY: number, rotation: number
  if (phase === "waiting") {
    rocketX = 12 + Math.sin(floatT * 2) * 0.6
    rocketY = 80 + Math.cos(floatT * 2.4) * 0.8
    rotation = -30
  } else if (phase === "crashed") {
    rocketX = 8 + progress * 78
    rocketY = 88 - progress * 70
    rotation = 90
  } else {
    rocketX = 8 + progress * 78 + Math.sin(floatT * 6) * 0.7
    rocketY = 88 - progress * 70 + Math.cos(floatT * 7) * 0.7
    rotation = -42 - progress * 8
  }

  // Trajectory curve.
  function buildPath() {
    const pts: string[] = []
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const p = (i / steps) * progress
      const x = 8 + p * 78
      const y = 88 - p * 70
      pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    }
    return pts.join(" ")
  }

  // Live ticker on the left: synthesize values up to current multiplier.
  // Shows a vertical column of recent fractions (always changing during run).
  const tickerValues: number[] = []
  if (phase === "running") {
    for (let i = 0; i < 7; i++) {
      const factor = 1 - i * 0.08
      tickerValues.push(Math.max(1, m * factor))
    }
  }

  const buttonLabel =
    betId && phase === "running"
      ? `${t("cashout")} ${(bet * multiplier).toFixed(2)} TON`
      : phase === "waiting"
        ? `${t("place_bet")} · ${secLeft}s`
        : t("place_bet")

  return (
    <div className="crash-screen">
      <div className={`sky bg-${bg}`}>
        <div className="stars" />
        <div className="stars stars-2" />
        {bg === "planet" && <div className="planet-bg" />}

        {/* Curve + filled area during running/crashed */}
        <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trail" x1="0" y1="100%" x2="100%" y2="0">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#ffb347" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffe66d" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.8" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {phase !== "waiting" && (
            <>
              <path d={`${buildPath()} L${rocketX.toFixed(2)},88 L8,88 Z`} fill="url(#fill)" />
              <path d={buildPath()} fill="none" stroke="url(#trail)" strokeWidth="1.6" strokeLinecap="round" filter="url(#glow)" />
            </>
          )}
        </svg>

        {/* Big center multiplier */}
        <div className={`big-multiplier ${phase}`}>
          {phase === "waiting"
            ? ""
            : m.toFixed(2) + (phase === "crashed" ? "×" : "×")}
        </div>

        {/* Countdown ring during waiting */}
        {phase === "waiting" && (
          <div className="countdown-wrap">
            <svg className="countdown-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" className="ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="ring-fg"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={(1 - countdownProgress) * 2 * Math.PI * 52}
              />
            </svg>
            <div className="countdown-num">{secLeft}</div>
            <div className="countdown-label">{t("waiting")}</div>
          </div>
        )}

        {/* Live ticker on the left */}
        {phase === "running" && (
          <div className="live-tape">
            {tickerValues.map((v, i) => (
              <div
                key={i}
                className="tape-num"
                style={{ opacity: 1 - i * 0.13, fontSize: `${18 - i * 1.4}px` }}
              >
                {v.toFixed(2)}×
              </div>
            ))}
          </div>
        )}

        {/* Rocket with flame trail */}
        <div
          className={`rocket ${phase}`}
          style={{
            left: `${rocketX}%`,
            top: `${rocketY}%`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          }}
        >
          {phase === "running" && (
            <div className="flame" style={{ height: `${20 + Math.sin(floatT * 30) * 6}px` }} />
          )}
          <span className="rocket-emoji">{SKIN_EMOJI[skin] || "🚀"}</span>
        </div>

        {phase === "crashed" && <div className="crash-overlay">💥 {t("crashed").toUpperCase()}</div>}
      </div>

      <div className="history-strip">
        {history.slice(0, 12).map((h, i) => (
          <div key={h.roundId + i} className={`pill ${pillColor(h.crashPoint)}`}>{h.crashPoint.toFixed(2)}</div>
        ))}
      </div>

      <div className="bet-controls">
        <div className="bet-row">
          <button className="bet-step" onClick={() => { haptic("light"); setBet((b) => Math.max(0.1, +(b - 0.5).toFixed(2))) }} disabled={!!betId}>−</button>
          <input type="number" min={0.1} step={0.1} value={bet} disabled={!!betId} onChange={(e) => setBet(Number(e.target.value))} />
          <button className="bet-step" onClick={() => { haptic("light"); setBet((b) => +(b + 0.5).toFixed(2)) }} disabled={!!betId}>+</button>
        </div>
        <button
          className={`main-action ${phase === "running" && betId ? "cashout" : ""}`}
          onClick={onMainAction}
          disabled={(phase === "waiting" && !!betId) || (phase === "crashed") || (phase === "running" && !betId)}
        >{buttonLabel}</button>
        {message && <div className="message">{message}</div>}
      </div>

      <div className="players-list">
        {players.length === 0 && <div className="empty">{t("waiting_bets")}</div>}
        {players.map((p, idx) => (
          <div key={p.userId + ":" + p.bet + ":" + idx} className={`player-row ${p.status}`}>
            <div className="avatar">{(p.name || "?").slice(0, 1).toUpperCase()}</div>
            <div className="player-info">
              <div className="player-name">{p.name}</div>
              <div className="player-bet">
                💎 {p.bet.toFixed(2)}
                {p.multiplier ? <span className="x"> ×{p.multiplier.toFixed(2)}</span> : null}
              </div>
            </div>
            <div className="player-result">
              {p.status === "cashed" && p.payout != null && <span className="win-tag">💎 {p.payout.toFixed(2)}</span>}
              {p.status === "lost" && <span className="lost-tag">—</span>}
              {p.status === "playing" && <span className="playing-tag">🔴</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
