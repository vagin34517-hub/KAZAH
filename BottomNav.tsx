import { useState } from "react"

const tabs = [
  { id: "crash", label: "Краш", icon: "🚀" },
  { id: "cases", label: "Кейсы", icon: "🎁" },
  { id: "season", label: "Сезон", icon: "🏆" },
  { id: "profile", label: "Профиль", icon: "👤" },
]

export function BottomNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
