import { useState } from "react"
import { useT, LANGS, setLang, type Lang } from "./i18n"
import { haptic, shareToTelegram, copyText } from "./telegram"
import type { MeInfo } from "./api"
import { DepositModal } from "./DepositModal"
import { WithdrawModal } from "./WithdrawModal"

export function Profile({ me, onOpenSettings }: { me: MeInfo | null; onOpenSettings: () => void }) {
  const { t, lang } = useT()
  const [langOpen, setLangOpen] = useState(false)
  const [wdOpen, setWdOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState("")
  const [depOpen, setDepOpen] = useState(false)
  const flag = LANGS.find((l) => l.id === lang)?.flag ?? "🌐"

  const xpPct = me ? Math.min(100, (me.xp / Math.max(1, me.xpNext)) * 100) : 0
  const inviteUrl = me?.inviteUrl || ""

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(""), 1800)
  }
  async function onCopy() {
    if (!inviteUrl) { showToast("—"); return }
    const ok = await copyText(inviteUrl)
    haptic(ok ? "success" : "error")
    if (ok) { setCopied(true); showToast(t("link_copied")); setTimeout(() => setCopied(false), 1500) }
  }
  function onInvite() {
    if (!inviteUrl) { showToast("—"); return }
    haptic("medium")
    shareToTelegram(inviteUrl, "🚀 Играй в KAZAH вместе со мной!")
  }
  function onRewards() { haptic("light"); showToast(t("coming_soon") + " 🏆") }

  return (
    <div className="profile-page">
      <div className="profile-toolbar">
        <button className="chip-btn" onClick={() => { haptic("light"); setLangOpen((v) => !v) }}>{flag}</button>
        <button className="chip-btn" onClick={() => { haptic("medium"); onOpenSettings() }}>📳</button>
      </div>

      {langOpen && (
        <div className="lang-popover">
          {LANGS.map((l) => (
            <button key={l.id} className={`lang-row ${lang === l.id ? "selected" : ""}`}
              onClick={() => { setLang(l.id as Lang); setLangOpen(false); haptic("success") }}>
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-name">{l.name}</span>
              {lang === l.id && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}

      <div className="profile-hero">
        <div className="hero-bg" />
        <div className="big-avatar">{(me?.name || "?").slice(0, 2).toUpperCase()}</div>
        <div className="profile-name">{me?.name || "—"} · <span className="lv">{me?.level ?? 1} {t("level")}</span></div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="xp-text">{me?.xp?.toFixed(1) ?? 0} / {me?.xpNext ?? 10} TON</div>
      </div>

      <div className="action-pair">
        <button className="big-btn primary" onClick={() => { haptic("medium"); setDepOpen(true) }}>➕ {t("topup")}</button>
        <button className="big-btn warn" onClick={() => { haptic("medium"); setWdOpen(true) }}>💸 {t("wd_title")}</button>
      </div>

      <div className="ref-card">
        <div className="ref-shine" />
        <div className="ref-emoji">🍎</div>
        <div className="ref-title">{t("referrals")}</div>
        <div className="ref-desc">{t("referrals_desc")}</div>
        <div className="ref-stats">
          <div className="stat-pill">💎 {t("balance")}: {(me?.refBalance ?? 0).toFixed(2)}</div>
          <div className="stat-pill">👤 {t("refs_count")}: {me?.refs ?? 0}</div>
          <div className="stat-pill">ℹ️ {t("terms")}</div>
        </div>
        <div className="ref-actions">
          <button className="ref-btn primary" onClick={onInvite}>{t("invite_friends")}</button>
          <button className="ref-btn ghost" onClick={onCopy}>{copied ? "✓" : t("copy_link")}</button>
        </div>
      </div>

      <div className="inventory-box">{t("inventory_empty")}</div>

      <DepositModal open={depOpen} onClose={() => setDepOpen(false)} />
      <WithdrawModal open={wdOpen} onClose={() => setWdOpen(false)} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
