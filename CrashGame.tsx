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
const GROWTH = 0.075 // same as server
const MAX_MULT = 5000

function pillColor(x: number) {
  if (x < 1.5) return "blue"
  if (x < 2) return "cyan"
  if (x < 5) return "green"
  if (x < 10) return "yellow"
  return "purple"
}

function computeMult(startedAt: number, nowMs: number) {
  const elapsed = Math.max(0, (nowMs - startedAt) / 1000)
  return Math.min(MAX_MULT, Math.exp(GROWTH * elapsed))
}

export function CrashGame({ skin, bg }: { skin: string; bg: string }) {
  const { t } = useT()
  const [phase, setPhase] = useState<Phase>("waiting")
  const [startedAt, setStartedAt] = useState(0)
  const [crashPoint, setCrashPoint] = useState(0)
  const [waitingEndsAt, setWaitingEndsAt] = useState(Date.now() + 10000)
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState("")
  const [now, setNow] = useState(Date.now())

  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // RAF loop — keeps clock + animations smooth at display refresh rate.
  useEffect(() => {
    let raf = 0
    const loop = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Initial fetch.
  useEffect(() => {
    api.history().then((r) => setHistory(r.items)).catch(() => {})
    api.players().then((r) => setPlayers(r.players)).catch(() => {})
  }, [])

  // WS + polling fallback. Server only pushes phase transitions; multiplier is local.
  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnect: any = null
    let pollTimer: any = null
    let wsAlive = false

    function applyMsg(msg: any) {
      if (msg.type === "running") {
        if (msg.startedAt) setStartedAt(msg.startedAt)
        if (phaseRef.current !== "running") { setPhase("running"); haptic("light") }
      } else if (msg.type === "crash") {
        if (msg.crashPoint) setCrashPoint(msg.crashPoint)
        if (msg.startedAt) setStartedAt(msg.startedAt)
        if (phaseRef.current !== "crashed") {
          setPhase("crashed")
          setBetId(null)
          haptic("error")
          api.history().then((r) => setHistory(r.items)).catch(() => {})
        }
      } else if (msg.type === "waiting") {
        if (msg.waitingEndsAt) setWaitingEndsAt(msg.waitingEndsAt)
        if (phaseRef.current !== "waiting") {
          setPhase("waiting")
          setBetId(null)
          setStartedAt(0)
          setCrashPoint(0)
          api.players().then((r) => setPlayers(r.players)).catch(() => {})
        }
      } else if (msg.type === "players") {
        setPlayers(msg.players)
      }
    }

    function applyState(s: any) {
      if (s.phase === "running") applyMsg({ type: "running", startedAt: s.startedAt })
      else if (s.phase === "crashed") applyMsg({ type: "crash", crashPoint: s.crashPoint, startedAt: s.startedAt })
      else if (s.phase === "waiting") applyMsg({ type: "waiting", waitingEndsAt: s.waitingEndsAt })
      if (s.players) setPlayers(s.players)
    }

    function startPolling() {
      if (pollTimer) return
      const poll = () => {
        if (wsAlive) { pollTimer = null; return }
        api.state().then(applyState).catch(() => {}).finally(() => { pollTimer = setTimeout(poll, 800) })
      }
      poll()
    }

    function connect() {
      if (!WS_URL) { startPolling(); return }
      try {
        ws = new WebSocket(WS_URL)
        ws.onopen = () => { wsAlive = true; if (pollTimer) { clearTimeout(pollTimer); pollTimer = null } }
        ws.onmessage = (e) => { try { applyMsg(JSON.parse(e.data)) } catch {} }
        ws.onclose = () => { wsAlive = false; startPolling(); reconnect = setTimeout(connect, 2500) }
        ws.onerror = () => { wsAlive = false; startPolling() }
      } catch { startPolling() }
    }
    connect()
    const guard = setTimeout(() => { if (!wsAlive) startPolling() }, 1500)
    return () => { clearTimeout(reconnect); clearTimeout(pollTimer); clearTimeout(guard); try { ws?.close() } catch {} }
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

  // Local multiplier — buttery smooth, never desyncs.
  let m = 1
  if (phase === "running" && startedAt) {
    m = computeMult(startedAt, now)
    if (crashPoint && m >= crashPoint) m = crashPoint // safety clamp
  } else if (phase === "crashed") {
    m = crashPoint || 1
  }

  // Countdown.
  const msLeft = Math.max(0, waitingEndsAt - now)
  const secLeft = Math.ceil(msLeft / 1000)
  const countdownProgress = Math.max(0, Math.min(1, msLeft / 10000))

  // Rocket positioning — always visible.
  const progress = Math.min(1, Math.log(Math.max(1, m)) / Math.log(20))
  const tAnim = now / 1000

  let rocketX: number, rocketY: number, rotation: number, rocketScale: number, rocketOpacity: number
  if (phase === "waiting") {
    // Idle on launch pad bottom-left, slight wobble.
    rocketX = 14 + Math.sin(tAnim * 1.8) * 0.7
    rocketY = 76 + Math.cos(tAnim * 2.2) * 1.4
    rotation = -28 + Math.sin(tAnim * 1.4) * 4
    rocketScale = 1
    rocketOpacity = 1
  } else if (phase === "crashed") {
    // Fly off-screen after crash for ~1s, then fade.
    const crashAge = startedAt ? Math.max(0, (now - startedAt) / 1000 - Math.log(crashPoint) / GROWTH) : 0
    const k = Math.min(1, crashAge / 1.2)
    rocketX = 8 + progress * 78 + k * 40
    rocketY = 88 - progress * 70 - k * 60
    rotation = 60 + k * 40
    rocketScale = 1 - k * 0.5
    rocketOpacity = Math.max(0, 1 - k * 1.3)
  } else {
    rocketX = 8 + progress * 78 + Math.sin(tAnim * 8) * 0.4
    rocketY = 88 - progress * 70 + Math.cos(tAnim * 10) * 0.5
    rotation = -42 - progress * 8
    rocketScale = 1 + progress * 0.18
    rocketOpacity = 1
  }

  // Trajectory path.
  function buildPath() {
    if (progress <= 0.005) return ""
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
  const path = buildPath()

  // Live tape on the left — 6 values cascading from current multiplier.
  const tape: number[] = []
  if (phase === "running") {
    for (let i = 0; i < 6; i++) tape.push(Math.max(1, m * (1 - i * 0.08)))
  }

  const buttonLabel =
    betId && phase === "running"
      ? `${t("cashout")} ${(bet * m).toFixed(2)} TON`
      : phase === "waiting" && betId
        ? `✓ ${bet} TON · ${secLeft}s`
        : phase === "waiting"
          ? `${t("place_bet")} · ${secLeft}s`
          : t("place_bet")

  return (
    <div className="crash-screen">
      <div className={`sky bg-${bg}`}>
        <div className="stars" />
        <div className="stars stars-2" />
        {bg === "planet" && <div className="planet-bg" />}

        <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trail" x1="0" y1="100%" x2="100%" y2="0">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#ffb347" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffe66d" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
            </linearGradient>
            <filter id="trailGlow">
              <feGaussianBlur stdDeviation="0.6" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {path && (
            <>
              <path d={`${path} L${rocketX.toFixed(2)},88 L8,88 Z`} fill="url(#fill)" />
              <path d={path} fill="none" stroke="url(#trail)" strokeWidth="1.5" strokeLinecap="round" filter="url(#trailGlow)" />
            </>
          )}
        </svg>

        {(phase === "running" || phase === "crashed") && (
          <div className={`big-multiplier ${phase}`}>{m.toFixed(2)}×</div>
        )}

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

        {phase === "running" && (
          <div className="live-tape">
            {tape.map((v, i) => (
              <div key={i} className="tape-num" style={{ opacity: 1 - i * 0.14, fontSize: `${22 - i * 1.6}px` }}>
                {v.toFixed(2)}×
              </div>
            ))}
          </div>
        )}

        <div
          className={`rocket-wrap ${phase}`}
          style={{
            left: `${rocketX}%`,
            top: `${rocketY}%`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${rocketScale})`,
            opacity: rocketOpacity,
          }}
        >
          {phase === "running" && (
            <div className="flame" style={{ height: `${22 + Math.sin(tAnim * 28) * 8}px` }} />
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
          disabled={(phase === "waiting" && !!betId) || phase === "crashed" || (phase === "running" && !betId)}
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
