import { useEffect, useState } from "react"
import { useT, LANGS, setLang, getLang, type Lang } from "./i18n"
import { haptic } from "./telegram"

const SKINS = [
  { id: "rocket", emoji: "🚀", locked: false },
  { id: "ufo", emoji: "🛸", locked: true },
  { id: "plane", emoji: "✈️", locked: true },
  { id: "helicopter", emoji: "🚁", locked: true },
  { id: "satellite", emoji: "🛰️", locked: true },
  { id: "meteor", emoji: "☄️", locked: true },
  { id: "alien", emoji: "👽", locked: true },
  { id: "fire", emoji: "🔥", locked: true },
  { id: "star", emoji: "⭐", locked: true },
]
const BACKGROUNDS = [
  { id: "stars", label: "Звёзды", locked: false },
  { id: "planet", label: "Планета", locked: false },
  { id: "nebula", label: "Туманность", locked: true },
  { id: "galaxy", label: "Галактика", locked: true },
]

export type SkinId = string
export type BgId = string

const LS_SKIN = "kazah.skin"
const LS_BG = "kazah.bg"
const LS_VIB = "kazah.vib"

export function loadSkin(): SkinId { return localStorage.getItem(LS_SKIN) || "rocket" }
export function loadBg(): BgId { return localStorage.getItem(LS_BG) || "stars" }
export function loadVib(): boolean { return localStorage.getItem(LS_VIB) !== "0" }

export function Settings({ open, onClose, onChange }: {
  open: boolean
  onClose: () => void
  onChange: (s: { skin: SkinId; bg: BgId; vib: boolean }) => void
}) {
  const { t, lang } = useT()
  const [tab, setTab] = useState<"skin" | "bg" | "lang">("skin")
  const [skin, setSkin] = useState<SkinId>(loadSkin())
  const [bg, setBg] = useState<BgId>(loadBg())
  const [vib, setVib] = useState<boolean>(loadVib())

  useEffect(() => { onChange({ skin, bg, vib }) }, [skin, bg, vib])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="sheet-title-pill">{t("settings")}</div>
          <div className="sheet-tabs">
            <button className={`tab ${tab === "skin" ? "active" : ""}`} onClick={() => setTab("skin")}>{t("skin")}</button>
            <button className={`tab ${tab === "bg" ? "active" : ""}`} onClick={() => setTab("bg")}>{t("background")}</button>
            <button className={`tab ${tab === "lang" ? "active" : ""}`} onClick={() => setTab("lang")}>{t("language")}</button>
          </div>
          <button
            className={`vib-btn ${vib ? "on" : ""}`}
            onClick={() => { setVib(!vib); localStorage.setItem(LS_VIB, vib ? "0" : "1"); haptic("medium") }}
            title={t("vibration")}
          >📳</button>
        </div>

        {tab === "skin" && (
          <div className="grid-9">
            {SKINS.map((s) => (
              <button
                key={s.id}
                className={`cell ${skin === s.id ? "selected" : ""} ${s.locked ? "locked" : ""}`}
                onClick={() => { if (!s.locked) { setSkin(s.id); localStorage.setItem(LS_SKIN, s.id); haptic("medium") } }}
              >
                {s.locked ? <span className="lock">🔒</span> : <span className="cell-emoji">{s.emoji}</span>}
              </button>
            ))}
          </div>
        )}

        {tab === "bg" && (
          <div className="grid-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                className={`bg-cell bg-${b.id} ${bg === b.id ? "selected" : ""} ${b.locked ? "locked" : ""}`}
                onClick={() => { if (!b.locked) { setBg(b.id); localStorage.setItem(LS_BG, b.id); haptic("medium") } }}
              >
                {b.locked && <span className="lock big">🔒</span>}
                <span className="bg-label">{b.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "lang" && (
          <div className="lang-list">
            {LANGS.map((l) => (
              <button
                key={l.id}
                className={`lang-row ${lang === l.id ? "selected" : ""}`}
                onClick={() => { setLang(l.id as Lang); haptic("success") }}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.name}</span>
                {lang === l.id && <span className="lang-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        <button className="close-btn" onClick={onClose}>{t("close")}</button>
      </div>
    </div>
  )
}
