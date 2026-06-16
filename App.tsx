import { useEffect, useState } from "react"
import { initTelegram, getUser } from "./telegram"
import { api, type MeInfo } from "./api"
import { CrashGame } from "./CrashGame"
import { BottomNav } from "./BottomNav"
import "./styles.css"

export default function App() {
  const [me, setMe] = useState<MeInfo | null>(null)
  const [tab, setTab] = useState("crash")
  const tgUser = getUser()

  useEffect(() => {
    initTelegram()
    api.me().then(setMe).catch(() => setMe({ userId: 0, name: tgUser?.first_name ?? "игрок", balance: 0, online: 0 }))
    const t = setInterval(() => api.me().then(setMe).catch(() => {}), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="app">
      <header className="top-bar">
        <div className="online">
          <span className="online-dot">👤</span>
          <span>{me?.online ?? 0}</span>
        </div>
        <button className="settings-btn">⚙️</button>
        <div className="balance-chip">
          <span className="ton-icon">💎</span>
          <span>{(me?.balance ?? 0).toFixed(2)}</span>
          <button className="plus-btn">+</button>
        </div>
      </header>

      <main className="main-content">
        {tab === "crash" && <CrashGame />}
        {tab === "cases" && <div className="placeholder">🎁 Кейсы — скоро</div>}
        {tab === "season" && <div className="placeholder">🏆 Сезон — скоро</div>}
        {tab === "profile" && (
          <div className="placeholder profile-box">
            <div className="big-avatar">{(me?.name || tgUser?.first_name || "?").slice(0, 1)}</div>
            <div className="profile-name">{me?.name || tgUser?.first_name || "Игрок"}</div>
            <div className="profile-id">ID: {me?.userId || tgUser?.id || "—"}</div>
            <div className="profile-balance">Баланс: 💎 {(me?.balance ?? 0).toFixed(2)} TON</div>
          </div>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
