import { useEffect, useRef, useState } from "react"
import { api, deriveWsUrl, type Player, type HistoryItem } from "./api"
import { useT } from "./i18n"
import { haptic } from "./telegram"

type Phase = "waiting" | "running" | "crashed"

const WS_URL = deriveWsUrl()
const GROWTH = 0.075
const MAX_MULT = 5000
const FRAME_MS = 50          // 20fps — plenty for visual smoothness, easy on iOS
const TRAIL_THROTTLE_MS = 120 // trail path rebuilds 8/sec only
const HIDDEN = { display: "none" } as const

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
  const skySizeRef = useRef({ w: 320, h: 280 })
  // Clock skew correction: serverNow - clientNowOnReceive. Added to Date.now() = synced server time.
  const serverOffsetRef = useRef(0)
  const mountedAtRef = useRef(performance.now())

  const [phase, setPhase] = useState<Phase>("waiting")
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [message, setMessage] = useState("")

  betRef.current = bet
  betIdRef.current = betId

  const skyRef = useRef<HTMLDivElement | null>(null)
  const rocketRef = useRef<HTMLDivElement | null>(null)
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

  // Measure sky size once + on resize.
  useEffect(() => {
    function measure() {
      if (!skyRef.current) return
      const r = skyRef.current.getBoundingClientRect()
      if (r.width > 0) skySizeRef.current = { w: r.width, h: r.height }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (skyRef.current) ro.observe(skyRef.current)
    window.addEventListener("resize", measure)
    return () => { ro.disconnect(); window.removeEventListener("resize", measure) }
  }, [])

  function rebuildTrail(progress: number) {
    if (!pathRef.current || !fillRef.current) return
    if (progress <= 0.005) {
      pathRef.current.setAttribute("d", "")
      fillRef.current.setAttribute("d", "")
      return
    }
    let d = ""
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const p = (i / steps) * progress
      const x = 8 + p * 78
      const y = 88 - p * 70
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " "
    }
    const lastX = 8 + progress * 78
    pathRef.current.setAttribute("d", d)
    fillRef.current.setAttribute("d", d + " L" + lastX.toFixed(1) + ",88 L8,88 Z")
  }

  // Animation loop — RAF with frame throttle. More reliable on mobile foreground than setInterval.
  useEffect(() => {
    let lastTrail = 0
    let lastFrame = 0
    let raf = 0
    function tick(ts: number) {
      raf = requestAnimationFrame(tick)
      if (ts - lastFrame < FRAME_MS) return
      lastFrame = ts
      // syncedNow = server-aligned time. Fixes phones with skewed clocks.
      const now = Date.now() + serverOffsetRef.current
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

      // Multiplier text.
      const mul = multRef.current
      if (mul) {
        if (ph === "running") {
          if (mul.style.display !== "block") mul.style.display = "block"
          mul.style.color = "#fff"
          mul.textContent = m.toFixed(2) + "\u00D7"
        } else if (ph === "crashed") {
          if (mul.style.display !== "block") mul.style.display = "block"
          mul.style.color = "#ff3b5c"
          mul.textContent = (crashPoint || 1).toFixed(2) + "\u00D7"
        } else if (mul.style.display !== "none") {
          mul.style.display = "none"
        }
      }

      const cd = cdRef.current
      if (cd) {
        if (ph === "waiting") {
          if (cd.style.display !== "block") cd.style.display = "block"
          const secLeft = Math.max(0, Math.ceil((waitingEndsAt - now) / 1000))
          if (cd.textContent !== String(secLeft)) cd.textContent = String(secLeft)
        } else if (cd.style.display !== "none") {
          cd.style.display = "none"
        }
      }

      const pill = pillRef.current
      if (pill) {
        if (ph === "running") {
          if (pill.style.display !== "inline-block") pill.style.display = "inline-block"
          pill.textContent = "\u00D7" + m.toFixed(2)
        } else if (pill.style.display !== "none") {
          pill.style.display = "none"
        }
      }

      if (btnAmountRef.current && ph === "running" && betIdRef.current) {
        btnAmountRef.current.textContent = (betRef.current * m).toFixed(2)
      }

      // Rocket position via translate3d (GPU-accelerated, single transform).
      const progress = Math.min(1, Math.log(Math.max(1, m)) / Math.log(20))
      // Use elapsed-since-mount for sin/cos animations — small numbers, identical on every device.
      const tAnim = (performance.now() - mountedAtRef.current) * 0.001
      let rxPct: number, ryPct: number, rot: number, sc: number, op: number
      if (ph === "waiting") {
        rxPct = 14 + Math.sin(tAnim * 1.8) * 0.5
        ryPct = 74 + Math.cos(tAnim * 2.2) * 1.0
        rot = 28 // nose up-right, ready to launch
        sc = 1; op = 1
      } else if (ph === "crashed") {
        const crashTime = startedAt ? startedAt + Math.log(Math.max(1, crashPoint)) * 1000 / GROWTH : now
        const k = Math.min(1, Math.max(0, (now - crashTime) / 1200))
        rxPct = 8 + progress * 78 + k * 35
        ryPct = 88 - progress * 70 - k * 55
        rot = 130 + k * 80 // tumbling
        sc = 1 - k * 0.4
        op = Math.max(0, 1 - k * 1.3)
      } else {
        rxPct = 8 + progress * 78
        ryPct = 88 - progress * 70
        rot = 48 + progress * 4 // nose points along flight trajectory (up-right)
        sc = 1 + progress * 0.12
        op = 1
      }

      const rkt = rocketRef.current
      if (rkt) {
        const sz = skySizeRef.current
        const px = (rxPct / 100) * sz.w
        const py = (ryPct / 100) * sz.h
        // translate3d forces a GPU layer; single transform property
        rkt.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0) translate(-50%,-50%) rotate(" + rot.toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")"
        if (rkt.style.opacity !== String(op)) rkt.style.opacity = String(op)
      }

      // Throttle trail rebuild — it's the only expensive DOM op.
      if (ph === "running" || ph === "crashed") {
        if (now - lastTrail >= TRAIL_THROTTLE_MS) {
          rebuildTrail(progress)
          lastTrail = now
        }
      } else if (pathRef.current && pathRef.current.getAttribute("d")) {
        rebuildTrail(0)
        lastTrail = now
      }
    }
    raf = requestAnimationFrame(tick)
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
      // Sync clock with server on every message that carries serverNow.
      if (typeof msg.serverNow === "number") {
        serverOffsetRef.current = msg.serverNow - Date.now()
      }
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
      if (typeof s.serverNow === "number") {
        serverOffsetRef.current = s.serverNow - Date.now()
      }
      if (s.phase === "running") applyMsg({ type: "running", startedAt: s.startedAt, serverNow: s.serverNow })
      else if (s.phase === "crashed") applyMsg({ type: "crash", crashPoint: s.crashPoint, startedAt: s.startedAt, serverNow: s.serverNow })
      else if (s.phase === "waiting") applyMsg({ type: "waiting", waitingEndsAt: s.waitingEndsAt, serverNow: s.serverNow })
      if (s.players) setPlayers(s.players)
    }

    function startPolling() {
      if (pollTimer) return
      const poll = () => {
        if (wsAlive) { pollTimer = null; return }
        api.state().then(applyState).catch(() => {}).finally(() => { pollTimer = setTimeout(poll, 1500) })
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
      <div ref={skyRef} className={"sky bg-" + bg}>
        <div className="stars" />
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
              <radialGradient id="flame" cx="0.5" cy="0" r="1">
                <stop offset="0%" stopColor="#ffe66d" stopOpacity="1" />
                <stop offset="50%" stopColor="#ffb347" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ff4757" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M5 42 L1 58 L14 50 Z" fill="#ff6b35" />
            <path d="M35 42 L39 58 L26 50 Z" fill="#ff6b35" />
            <path d="M14 14 Q14 5 20 1 Q26 5 26 14 L26 50 L14 50 Z" fill="url(#rocketBody)" stroke="#5a6478" strokeWidth="0.6" />
            <path d="M14 14 Q14 5 20 1 Q26 5 26 14 Z" fill="url(#rocketNose)" />
            <circle cx="20" cy="22" r="4.2" fill="#36b1ff" stroke="#0d4a78" strokeWidth="0.8" />
            <circle cx="18.8" cy="20.8" r="1.3" fill="rgba(255,255,255,0.75)" />
            <line x1="14" y1="36" x2="26" y2="36" stroke="#5a6478" strokeWidth="0.5" />
            <rect x="16" y="50" width="8" height="4" fill="#4a5060" rx="1" />
            {/* Static flame at the bottom of rocket (oriented along nose-tail axis) */}
            <ellipse cx="20" cy="60" rx="6" ry="4" fill="url(#flame)" />
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
