import { useEffect, useRef, useState } from "react"
import { api, deriveWsUrl, type Player, type HistoryItem } from "./api"
import { useT } from "./i18n"
import { haptic } from "./telegram"

type Phase = "waiting" | "running" | "crashed"

const WS_URL = deriveWsUrl()
const GROWTH = 0.075
const MAX_MULT = 5000
const HIDDEN = { display: "none" } as const
const SHOWN_BLOCK = { display: "block" } as const

function pillColor(x: number) {
  if (x < 1.5) return "blue"
  if (x < 2) return "cyan"
  if (x < 5) return "green"
  if (x < 10) return "yellow"
  return "purple"
}

export function CrashGame({ skin: _skin, bg }: { skin: string; bg: string }) {
  const { t } = useT()

  const phaseRef = useRef<Phase>("waiting")
  const startedAtRef = useRef(0)
  const crashPointRef = useRef(0)
  const waitingEndsAtRef = useRef(Date.now() + 10000)
  const betRef = useRef(1)
  const betIdRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<Phase>("waiting")
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState("")

  betRef.current = bet
  betIdRef.current = betId

  const rocketRef = useRef<HTMLDivElement | null>(null)
  const flameRef = useRef<HTMLDivElement | null>(null)
  const multRef = useRef<HTMLDivElement | null>(null)
  const cdRef = useRef<HTMLDivElement | null>(null)
  const pillRef = useRef<HTMLDivElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const fillRef = useRef<SVGPathElement | null>(null)
  const btnAmountRef = useRef<HTMLSpanElement | null>(null)

  function setPhaseSafe(p: Phase) {
    if (phaseRef.current === p) return
    phaseRef.current = p
    setPhase(p)
  }

  function rebuildTrail(progress: number) {
    if (!pathRef.current || !fillRef.current) return
    if (progress <= 0.005) {
      pathRef.current.setAttribute("d", "")
      fillRef.current.setAttribute("d", "")
      return
    }
    let d = ""
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const p = (i / steps) * progress
      const x = 8 + p * 78
      const y = 88 - p * 70
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " "
    }
    const lastX = 8 + progress * 78
    pathRef.current.setAttribute("d", d)
    fillRef.current.setAttribute("d", d + " L" + lastX.toFixed(2) + ",88 L8,88 Z")
  }

  useEffect(() => {
    let raf = 0
    let last = 0
    function frame(ts: number) {
      raf = requestAnimationFrame(frame)
      if (ts - last < 33) return
      last = ts

      const now = Date.now()
      const ph = phaseRef.current
      const startedAt = startedAtRef.current
      const crashPoint = crashPointRef.current
      const waitingEndsAt = waitingEndsAtRef.current

      let m = 1
      if (ph === "running" && startedAt) {
        m = Math.exp(GROWTH * Math.max(0, (now - startedAt) / 1000))
        if (m > MAX_MULT) m = MAX_MULT
        if (crashPoint && m >= crashPoint) m = crashPoint
      } else if (ph === "crashed") {
        m = crashPoint || 1
      }

      if (multRef.current) {
        if (ph === "running") {
          multRef.current.style.display = "block"
          multRef.current.style.color = "#fff"
          multRef.current.textContent = m.toFixed(2) + "\u00D7"
        } else if (ph === "crashed") {
          multRef.current.style.display = "block"
          multRef.current.style.color = "#ff3b5c"
          multRef.current.textContent = (crashPoint || 1).toFixed(2) + "\u00D7"
        } else {
          multRef.current.style.display = "none"
        }
      }

      if (cdRef.current) {
        if (ph === "waiting") {
          const secLeft = Math.max(0, Math.ceil((waitingEndsAt - now) / 1000))
          cdRef.current.style.display = "block"
          cdRef.current.textContent = String(secLeft)
        } else {
          cdRef.current.style.display = "none"
        }
      }

      if (pillRef.current) {
        if (ph === "running") {
          pillRef.current.style.display = "inline-block"
          pillRef.current.textContent = "\u00D7" + m.toFixed(2)
        } else {
          pillRef.current.style.display = "none"
        }
      }

      if (btnAmountRef.current && ph === "running" && betIdRef.current) {
        btnAmountRef.current.textContent = (betRef.current * m).toFixed(2)
      }

      const progress = Math.min(1, Math.log(Math.max(1, m)) / Math.log(20))
      const tAnim = now / 1000
      let rx: number, ry: number, rot: number, sc: number, op: number
      if (ph === "waiting") {
        rx = 14 + Math.sin(tAnim * 1.8) * 0.6
        ry = 74 + Math.cos(tAnim * 2.2) * 1.2
        rot = -28 + Math.sin(tAnim * 1.4) * 4
        sc = 1; op = 1
      } else if (ph === "crashed") {
        const crashTime = startedAt ? startedAt + Math.log(Math.max(1, crashPoint)) * 1000 / GROWTH : now
        const k = Math.min(1, Math.max(0, (now - crashTime) / 1200))
        rx = 8 + progress * 78 + k * 40
        ry = 88 - progress * 70 - k * 60
        rot = 60 + k * 50
        sc = 1 - k * 0.5
        op = Math.max(0, 1 - k * 1.3)
      } else {
        rx = 8 + progress * 78 + Math.sin(tAnim * 8) * 0.3
        ry = 88 - progress * 70 + Math.cos(tAnim * 10) * 0.4
        rot = -42 - progress * 8
        sc = 1 + progress * 0.15
        op = 1
      }
      if (rocketRef.current) {
        const s = rocketRef.current.style
        s.left = rx + "%"
        s.top = ry + "%"
        s.transform = "translate(-50%, -50%) rotate(" + rot.toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")"
        s.opacity = String(op)
      }
      if (flameRef.current) {
        if (ph === "running") {
          flameRef.current.style.display = "block"
          flameRef.current.style.height = (22 + Math.sin(tAnim * 28) * 8).toFixed(1) + "px"
        } else {
          flameRef.current.style.display = "none"
        }
      }

      if (ph === "running" || ph === "crashed") rebuildTrail(progress)
      else if (pathRef.current && pathRef.current.getAttribute("d")) rebuildTrail(0)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    api.history().then((r) => setHistory(r.items)).catch(() => {})
    api.players().then((r) => setPlayers(r.players)).catch(() => {})
  }, [])

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnect: any = null
    let pollTimer: any = null
    let wsAlive = false

    function applyMsg(msg: any) {
      if (msg.type === "running") {
        if (msg.startedAt) startedAtRef.current = msg.startedAt
        if (phaseRef.current !== "running") { setPhaseSafe("running"); haptic("light") }
      } else if (msg.type === "crash") {
        if (msg.crashPoint) crashPointRef.current = msg.crashPoint
        if (msg.startedAt) startedAtRef.current = msg.startedAt
        if (phaseRef.current !== "crashed") {
          setPhaseSafe("crashed"); setBetId(null); haptic("error")
          api.history().then((r) => setHistory(r.items)).catch(() => {})
        }
      } else if (msg.type === "waiting") {
        if (msg.waitingEndsAt) waitingEndsAtRef.current = msg.waitingEndsAt
        if (phaseRef.current !== "waiting") {
          setPhaseSafe("waiting"); setBetId(null)
          startedAtRef.current = 0; crashPointRef.current = 0
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
        api.state().then(applyState).catch(() => {}).finally(() => { pollTimer = setTimeout(poll, 1200) })
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
        setBetId(r.betId); setMessage(t("bet_accepted") + " \u00B7 " + bet + " TON")
      } catch (e: any) { setMessage(e.message || t("bet_error")); haptic("error") }
    } else if (phase === "running" && betId) {
      try {
        const r = await api.cashout(betId)
        setMessage(t("withdrew") + ": " + r.payout.toFixed(2) + " TON")
        setBetId(null); haptic("success")
      } catch { setMessage(t("too_late")); haptic("error") }
    }
  }

  return (
    <div className="crash-screen">
      <div className={"sky bg-" + bg}>
        <div className="stars" />
        <div className="stars stars-2" />
        <div className="planet-bg" />

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
          </defs>
          <path ref={fillRef} d="" fill="url(#fill)" />
          <path ref={pathRef} d="" fill="none" stroke="url(#trail)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <div ref={cdRef} className="countdown-big" style={HIDDEN}>10</div>
        <div ref={multRef} className="running-big" style={HIDDEN}>1.00</div>

        <div ref={rocketRef} className="rocket-wrap">
          <div ref={flameRef} className="flame" style={HIDDEN} />
          <svg className="rocket-svg" viewBox="0 0 40 64" width="46" height="74">
            <defs>
              <linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dce3ee" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#a0acc0" />
              </linearGradient>
              <linearGradient id="rocketNose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5a6c" />
                <stop offset="100%" stopColor="#c8344a" />
              </linearGradient>
            </defs>
            <path d="M5 42 L1 58 L14 50 Z" fill="#ff6b35" />
            <path d="M35 42 L39 58 L26 50 Z" fill="#ff6b35" />
            <path d="M14 14 Q14 5 20 1 Q26 5 26 14 L26 50 L14 50 Z" fill="url(#rocketBody)" stroke="#5a6478" strokeWidth="0.6" />
            <path d="M14 14 Q14 5 20 1 Q26 5 26 14 Z" fill="url(#rocketNose)" />
            <circle cx="20" cy="22" r="4.2" fill="#36b1ff" stroke="#0d4a78" strokeWidth="0.8" />
            <circle cx="18.8" cy="20.8" r="1.3" fill="rgba(255,255,255,0.75)" />
            <line x1="14" y1="36" x2="26" y2="36" stroke="#5a6478" strokeWidth="0.5" />
            <rect x="16" y="50" width="8" height="4" fill="#4a5060" rx="1" />
          </svg>
        </div>
      </div>

      <div className="history-strip">
        <div ref={pillRef} className="pill current-pill" style={HIDDEN}>×1.00</div>
        {phase === "waiting" && (<div className="pill waiting-pill">{t("waiting")}</div>)}
        {history.slice(0, 12).map((h, i) => (
          <div key={h.roundId + ":" + i} className={"pill " + pillColor(h.crashPoint)}>{h.crashPoint.toFixed(2)}</div>
        ))}
      </div>

      <div className="bet-controls">
        <div className="bet-row">
          <button className="bet-step" onClick={() => { haptic("light"); setBet((b) => Math.max(0.1, +(b - 0.5).toFixed(2))) }} disabled={!!betId}>−</button>
          <input type="number" min={0.1} step={0.1} value={bet} disabled={!!betId} onChange={(e) => setBet(Number(e.target.value))} />
          <button className="bet-step" onClick={() => { haptic("light"); setBet((b) => +(b + 0.5).toFixed(2)) }} disabled={!!betId}>+</button>
        </div>
        <button
          className={"main-action " + (phase === "running" && betId ? "cashout" : "")}
          onClick={onMainAction}
          disabled={(phase === "waiting" && !!betId) || phase === "crashed" || (phase === "running" && !betId)}
        >
          {phase === "running" && betId
            ? (<>{t("cashout")} <span ref={btnAmountRef}>{bet.toFixed(2)}</span> TON</>)
            : phase === "waiting" && betId
              ? (<>✓ {bet} TON</>)
              : t("place_bet")}
        </button>
        {message && <div className="message">{message}</div>}
      </div>

      <div className="players-list">
        {players.length === 0 && <div className="empty">{t("waiting_bets")}</div>}
        {players.map((p, idx) => (
          <div key={p.userId + ":" + p.bet + ":" + idx} className={"player-row " + p.status}>
            <div className="avatar">{(p.name || "?").slice(0, 1).toUpperCase()}</div>
            <div className="player-info">
              <div className="player-name">{p.name}</div>
              <div className="player-bet">💎 {p.bet.toFixed(2)}{p.multiplier ? <span className="x"> ×{p.multiplier.toFixed(2)}</span> : null}</div>
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
