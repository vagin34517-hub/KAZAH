import { useEffect, useState } from "react"
import { initTelegram, getUser, haptic } from "./telegram"
import { api, type MeInfo } from "./api"
import { CrashGame } from "./CrashGame"
import { BottomNav } from "./BottomNav"
import { Settings, loadSkin, loadBg, loadVib } from "./Settings"
import { Profile } from "./Profile"
import { Cases } from "./Cases"
import { Season } from "./Season"
import { DepositModal } from "./DepositModal"
import "./styles.css"

export default function App() {
  const [me, setMe] = useState<MeInfo | null>(null)
  const [tab, setTab] = useState("crash")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
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
    api.me().then(setMe).catch(() => setMe(fallback))
    const i = setInterval(() => api.me().then(setMe).catch(() => {}), 5000)
    return () => clearInterval(i)
  }, [])

  return (
    <div className={`app theme-${bg}`}>
      <header className="top-bar">
        <div className="online"><span>👤</span><span>{me?.online ?? 0}</span></div>
        <button className="icon-btn" onClick={() => { haptic("light"); setSettingsOpen(true) }}>⚙️</button>
        <div className="balance-chip" onClick={() => { haptic("medium"); setDepositOpen(true) }}>
          <span className="ton-icon">💎</span>
          <span>{(me?.balance ?? 0).toFixed(2)}</span>
          <button className="plus-btn" onClick={(e) => { e.stopPropagation(); haptic("medium"); setDepositOpen(true) }}>+</button>
        </div>
      </header>

      <main className="main-content">
        {tab === "crash" && <CrashGame skin={skin} bg={bg} />}
        {tab === "cases" && <Cases />}
        {tab === "season" && <Season level={me?.level ?? 1} />}
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
