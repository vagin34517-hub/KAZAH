import { useT } from "./i18n"

const LEVELS = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  reward: i < 3 ? `💎 ${(i + 1) * 0.5}` : i < 6 ? `🎁 Case` : i < 9 ? `🚀 Skin` : "👑 LEGEND",
}))

export function Season({ level }: { level: number }) {
  const { t } = useT()
  return (
    <div className="season-page">
      <h2 className="page-title">🏆 {t("season")}</h2>
      <div className="season-strip">
        {LEVELS.map((l) => (
          <div key={l.level} className={`season-step ${level >= l.level ? "done" : ""} ${level + 1 === l.level ? "next" : ""}`}>
            <div className="step-num">{l.level}</div>
            <div className="step-reward">{l.reward}</div>
          </div>
        ))}
      </div>
      <div className="season-hint">{t("coming_soon")}</div>
    </div>
  )
}
