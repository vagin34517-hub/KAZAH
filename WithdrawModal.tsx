import { useEffect, useState } from "react"
import { api, type WithdrawInfo, type WithdrawItem } from "./api"
import { useT } from "./i18n"
import { haptic } from "./telegram"

export function WithdrawModal({ open, onClose, onSubmitted }: {
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}) {
  const { t } = useT()
  const [info, setInfo] = useState<WithdrawInfo | null>(null)
  const [items, setItems] = useState<WithdrawItem[]>([])
  const [amount, setAmount] = useState("")
  const [address, setAddress] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [tab, setTab] = useState<"new" | "history">("new")

  useEffect(() => {
    if (!open) return
    setError("")
    api.withdrawInfo().then(setInfo).catch((e) => setError(e.message || "err"))
    api.withdrawList().then((r) => setItems(r.items)).catch(() => {})
  }, [open])

  if (!open) return null

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 1800) }

  async function submit() {
    if (busy) return
    setError(""); setBusy(true)
    const amt = Number(amount)
    if (!(amt > 0)) { setError(t("wd_bad_amount")); setBusy(false); haptic("error"); return }
    if (!address.trim()) { setError(t("wd_bad_addr")); setBusy(false); haptic("error"); return }
    try {
      const r = await api.withdrawRequest(amt, address.trim())
      haptic("success")
      flash(t("wd_submitted") + " #" + r.id)
      setAmount(""); setAddress("")
      api.withdrawInfo().then(setInfo).catch(() => {})
      api.withdrawList().then((res) => setItems(res.items)).catch(() => {})
      onSubmitted?.()
      setTab("history")
    } catch (e: any) {
      setError(e.message || "err"); haptic("error")
    } finally {
      setBusy(false)
    }
  }

  const fee = info?.fee ?? 0
  const net = Number(amount) > 0 ? Math.max(0, Number(amount)) : 0
  const totalDeducted = net + fee

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sheet wd-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="deposit-title">💸 {t("wd_title")}</h2>

        <div className="sheet-tabs">
          <button className={`tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}>{t("wd_new")}</button>
          <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>{t("wd_history")} {items.length > 0 ? `(${items.length})` : ""}</button>
        </div>

        {tab === "new" && (
          <>
            {info && (
              <div className="wd-summary">
                <div className="wd-summary-row">
                  <span>{t("balance")}</span><b>{info.balance.toFixed(2)} TON</b>
                </div>
                <div className="wd-summary-row">
                  <span>{t("wd_limits")}</span><b>{info.min} – {info.max} TON</b>
                </div>
                <div className="wd-summary-row">
                  <span>{t("wd_fee")}</span><b>{info.fee} TON</b>
                </div>
              </div>
            )}

            <div className="deposit-field">
              <div className="field-label">{t("wd_amount")}</div>
              <div className="field-value">
                <input
                  className="wd-input"
                  type="number"
                  min={info?.min ?? 0.5}
                  step="0.1"
                  placeholder={String(info?.min ?? 0.5)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button className="copy-btn" onClick={() => {
                  if (!info) return
                  const max = Math.max(0, info.balance - info.fee)
                  setAmount(max.toFixed(2)); haptic("light")
                }}>MAX</button>
              </div>
            </div>

            <div className="deposit-field">
              <div className="field-label">{t("wd_address")}</div>
              <div className="field-value">
                <input
                  className="wd-input mono"
                  type="text"
                  placeholder="UQ… / EQ…"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            {net > 0 && info && (
              <div className="wd-calc">
                <div className="wd-calc-row">
                  <span>{t("wd_you_get")}</span><b className="green">{net.toFixed(2)} TON</b>
                </div>
                <div className="wd-calc-row">
                  <span>{t("wd_total_deducted")}</span><b>{totalDeducted.toFixed(2)} TON</b>
                </div>
              </div>
            )}

            {error && <div className="wd-error">{error}</div>}

            <button
              className="wd-submit"
              disabled={busy || !info || !info.canWithdraw}
              onClick={submit}
            >
              {busy ? "⏳…" : "💸 " + t("wd_submit")}
            </button>
            <div className="deposit-hint">{t("wd_hint")}</div>
          </>
        )}

        {tab === "history" && (
          <div className="wd-history">
            {items.length === 0 && <div className="deposit-hint">{t("wd_no_history")}</div>}
            {items.map((w) => (
              <div key={w.id} className={`wd-item wd-${w.status}`}>
                <div className="wd-item-head">
                  <span className="wd-item-id">#{w.id}</span>
                  <span className={`wd-item-status wd-status-${w.status}`}>
                    {w.status === "pending" && "⏳ " + t("wd_pending")}
                    {w.status === "approved" && "✅ " + t("wd_approved")}
                    {w.status === "rejected" && "❌ " + t("wd_rejected")}
                  </span>
                </div>
                <div className="wd-item-amt">{w.amount.toFixed(2)} TON</div>
                <div className="wd-item-addr mono">{w.address.slice(0, 8)}…{w.address.slice(-6)}</div>
                {w.reason && <div className="wd-item-reason">{w.reason}</div>}
                {w.txHash && <div className="wd-item-tx mono">tx: {w.txHash.slice(0, 14)}…</div>}
              </div>
            ))}
          </div>
        )}

        <button className="close-btn ghost" onClick={onClose}>{t("close")}</button>
        {toast && <div className="toast top">{toast}</div>}
      </div>
    </div>
  )
}
