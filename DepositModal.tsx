import { useEffect, useState } from "react"
import { api, type DepositInfo } from "./api"
import { useT } from "./i18n"
import { copyText, haptic } from "./telegram"

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const [info, setInfo] = useState<DepositInfo | null>(null)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    api.depositInfo()
      .then(setInfo)
      .catch((e) => setError(e.message || "Ошибка"))
  }, [open])

  if (!open) return null

  function flash(msg: string) {
    setToast(msg); setTimeout(() => setToast(""), 1500)
  }
  async function doCopy(text: string, label: string) {
    const ok = await copyText(text)
    haptic(ok ? "success" : "error")
    if (ok) flash(label + ": " + t("link_copied"))
  }
  function openTransferLink() {
    if (!info?.address) return
    haptic("medium")
    // Universal https deep link to Tonkeeper that works inside Telegram WebView
    const https = "https://app.tonkeeper.com/transfer/" + info.address +
      "?text=" + encodeURIComponent(info.comment) +
      (info.minTon ? "&amount=" + Math.floor(info.minTon * 1e9) : "")
    const tg: any = (window as any).Telegram?.WebApp
    // Inside Telegram, openLink({ try_instant_view: false }) is the only reliable way out to a browser/wallet
    try {
      if (tg?.openLink) { tg.openLink(https, { try_instant_view: false }); return }
    } catch {}
    try { window.open(https, "_blank"); return } catch {}
    try { window.location.href = https } catch {}
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet deposit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="deposit-title">💎 {t("topup")} TON</h2>

        {error && <div className="deposit-error">{error}</div>}
        {!info && !error && <div className="deposit-loading">…</div>}

        {info && !info.enabled && (
          <div className="deposit-disabled">{t("topup_soon")}</div>
        )}

        {info && info.enabled && (
          <>
            <div className="deposit-step">
              <div className="step-num">1</div>
              <div className="step-text">{t("dep_step_1")}</div>
            </div>
            <div className="deposit-field">
              <div className="field-label">{t("dep_address")}</div>
              <div className="field-value">
                <span className="mono">{info.address}</span>
                <button className="copy-btn" onClick={() => doCopy(info.address, t("dep_address"))}>⧉</button>
              </div>
            </div>

            <div className="deposit-step">
              <div className="step-num">2</div>
              <div className="step-text"><b>{t("dep_step_2")}</b></div>
            </div>
            <div className="deposit-field highlight">
              <div className="field-label">{t("dep_comment")}</div>
              <div className="field-value">
                <span className="mono big">{info.comment}</span>
                <button className="copy-btn" onClick={() => doCopy(info.comment, t("dep_comment"))}>⧉</button>
              </div>
            </div>

            <div className="deposit-step">
              <div className="step-num">3</div>
              <div className="step-text">{t("dep_step_3")} (мин. {info.minTon} TON)</div>
            </div>

            <button className="close-btn" onClick={openTransferLink}>🚀 {t("dep_open_wallet")}</button>
            <div className="deposit-hint">{t("dep_hint")}</div>
          </>
        )}

        <button className="close-btn ghost" onClick={onClose}>{t("close")}</button>
        {toast && <div className="toast top">{toast}</div>}
      </div>
    </div>
  )
}
