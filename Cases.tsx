import { useState } from "react"
import { useT } from "./i18n"
import { haptic } from "./telegram"

const CASES = [
  { id: "free", emoji: "🎁", name: "Free", price: 0, locked: false },
  { id: "bronze", emoji: "🥉", name: "Bronze", price: 1, locked: true },
  { id: "silver", emoji: "🥈", name: "Silver", price: 5, locked: true },
  { id: "gold", emoji: "🥇", name: "Gold", price: 25, locked: true },
  { id: "diamond", emoji: "💎", name: "Diamond", price: 100, locked: true },
  { id: "legend", emoji: "👑", name: "Legend", price: 500, locked: true },
]

export function Cases() {
  const { t } = useT()
  const [toast, setToast] = useState("")
  function open(c: typeof CASES[0]) {
    if (c.locked) { haptic("error"); setToast(t("coming_soon")); setTimeout(() => setToast(""), 1500); return }
    haptic("success"); setToast("🎉 +0.42 TON"); setTimeout(() => setToast(""), 1500)
  }
  return (
    <div className="cases-page">
      <h2 className="page-title">🎁 {t("cases")}</h2>
      <div className="cases-grid">
        {CASES.map((c) => (
          <button key={c.id} className={`case-card ${c.locked ? "locked" : ""}`} onClick={() => open(c)}>
            <div className="case-emoji">{c.emoji}</div>
            <div className="case-name">{c.name}</div>
            <div className="case-price">{c.price === 0 ? "FREE" : `💎 ${c.price}`}</div>
            {c.locked && <div className="case-lock">🔒</div>}
          </button>
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
