import { useEffect, useState } from "react"
import { initTelegram, getUser, haptic } from "./telegram"
import { api, type MeInfo } from "./api"
import { CrashGame } from "./CrashGame"
import { BottomNav } from "./BottomNav"
import { Settings, loadSkin, loadBg, loadVib } from "./Settings"
import { Profile } from "./Profile"
import { Mines } from "./Mines"
import { Leaderboard } from "./Leaderboard"
import { DepositModal } from "./DepositModal"
import { Splash } from "./Splash"
import { Market } from "./Market"
import "./styles.css"

export default function App() {
  const [me, setMe] = useState<MeInfo | null>(null)
  const [tab, setTab] = useState("crash")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [skin, setSkin] = useState(loadSkin())
  const [bg, setBg] = useState(loadBg())
  const [_vib, setVib] = useState(loadVib())
  const tgUser = getUser()

  useEffect(() => {
    initTelegram()
    const fallback: MeInfo = {
      userId: tgUser?.id ?? 0,
      name: tgUser?.first_name ?? "Игрок",
      balance: 0, online: 0, level: 1, xp: 0, xpNext: 10,
      refs: 0, refBalance: 0, inviteUrl: "",
    }
    // Open-from-chat-list bug: when the WebApp is launched via the chat-list
    // shortcut (not via /start), initData can arrive a tick AFTER React mounts.
    // Retry /api/me a few times with backoff before falling back to the
    // anonymous demo profile so the user doesn't see "0 TON / Игрок".
    let cancelled = false
    async function loadMe(attempt = 0): Promise<void> {
      try {
        const m = await api.me()
        if (!cancelled) setMe(m)
      } catch (e) {
        if (cancelled) return
        if (attempt < 4) {
          setTimeout(() => loadMe(attempt + 1), 250 * (attempt + 1))
        } else {
          setMe(fallback)
        }
      }
    }
    loadMe()
    const i = setInterval(() => api.me().then((m) => !cancelled && setMe(m)).catch(() => {}), 5000)
    return () => { cancelled = true; clearInterval(i) }
  }, [])

  return (
    <div className={`app theme-${bg}`}>
      {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
      <header className="top-header">
        <div className="brand">KAZAH</div>
        <div className="top-header-right">
          <div className="balance-pill" onClick={() => { haptic("medium"); setDepositOpen(true) }}>
            <svg className="ton-gem" viewBox="0 0 24 24" fill="none">
              <path d="M2 7 L12 22 L22 7 L18 3 L6 3 Z" fill="url(#tonGrad)" stroke="#fff" strokeOpacity="0.3" strokeWidth="0.5"/>
              <defs>
                <linearGradient id="tonGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6ee7ff"/>
                  <stop offset="100%" stopColor="#0098ea"/>
                </linearGradient>
              </defs>
            </svg>
            <span>{(me?.balance ?? 0).toFixed(2)}</span>
            <span className="ton-suffix">TON</span>
            <span className="plus-mark">+</span>
          </div>
          <button className="icon-btn" onClick={() => { haptic("light"); setSettingsOpen(true) }} aria-label="settings">⚙</button>
        </div>
      </header>

      <main className="main-content">
        {tab === "crash" && <CrashGame skin={skin} bg={bg} />}
        {tab === "mines" && <Mines />}
        {tab === "market" && <Market />}
        {tab === "leaderboard" && <Leaderboard myUserId={me?.userId} />}
        {tab === "profile" && <Profile me={me} onOpenSettings={() => setSettingsOpen(true)} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={(s) => { setSkin(s.skin); setBg(s.bg); setVib(s.vib) }}
      />
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  )
}
