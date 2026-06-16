import { useT } from "./i18n"
import { haptic } from "./telegram"

const tabs = [
  { id: "crash", icon: "🚀" },
  { id: "cases", icon: "🎁" },
  { id: "season", icon: "🏆" },
  { id: "profile", icon: "👤" },
]

export function BottomNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const { t } = useT()
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-btn ${active === tab.id ? "active" : ""}`}
          onClick={() => { haptic("light"); onChange(tab.id) }}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{t(tab.id)}</span>
        </button>
      ))}
    </nav>
  )
}
