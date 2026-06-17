import { useEffect, useState } from "react"
import { api } from "./api"
import { useT } from "./i18n"
import { haptic } from "./telegram"

const GRID = 25
const PRESETS = [1, 3, 5, 7, 10, 15, 24]
const BET_PRESETS = [0.1, 0.5, 1, 5, 10]

export function Mines() {
  const { t } = useT()
  const [bet, setBet] = useState(0.5)
  const [minesCount, setMinesCount] = useState(3)
  const [gameId, setGameId] = useState<string | null>(null)
  const [opened, setOpened] = useState<number[]>([])
  const [bombs, setBombs] = useState<number[] | null>(null)
  const [multiplier, setMultiplier] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [finished, setFinished] = useState<"won" | "lost" | null>(null)

  // Resume in-flight game on mount (e.g. user navigated away mid-game)
  useEffect(() => {
    api.minesActive().then((r) => {
      if (r.game) {
        setGameId(r.game.gameId)
        setBet(r.game.bet)
        setMinesCount(r.game.mines)
        setOpened(r.game.opened)
        setMultiplier(r.game.multiplier)
      }
    }).catch(() => {})
  }, [])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 1500) }

  async function start() {
    if (busy) return
    setBusy(true); setError(""); setFinished(null); setBombs(null)
    try {
      const r = await api.minesStart(bet, minesCount)
      setGameId(r.gameId); setOpened([]); setMultiplier(r.multiplier)
      haptic("medium")
    } catch (e: any) { setError(e.message || "err"); haptic("error") }
    finally { setBusy(false) }
  }

  async function open(cell: number) {
    if (!gameId || busy || opened.includes(cell) || bombs) return
    setBusy(true)
    try {
      const r = await api.minesOpen(gameId, cell)
      setOpened(r.opened); setMultiplier(r.multiplier)
      if (r.hit) {
        setBombs(r.mines || []); setFinished("lost"); setGameId(null); haptic("error")
        flash(t("mines_boom"))
      } else if (r.autoCashout) {
        setBombs(r.mines || []); setFinished("won"); setGameId(null); haptic("success")
        flash("+" + (r.payout || 0).toFixed(2) + " TON")
      } else { haptic("light") }
    } catch (e: any) { setError(e.message || "err") }
    finally { setBusy(false) }
  }

  async function cashout() {
    if (!gameId || busy || opened.length === 0) return
    setBusy(true)
    try {
      const r = await api.minesCashout(gameId)
      setBombs(r.mines); setFinished("won"); setGameId(null); haptic("success")
      flash("+" + r.payout.toFixed(2) + " TON @ " + r.multiplier.toFixed(2) + "×")
    } catch (e: any) { setError(e.message || "err") }
    finally { setBusy(false) }
  }

  const isPlaying = !!gameId
  const nextMultiplier = isPlaying ? computeNextMultiplier(opened.length, minesCount) : multiplier
  const profit = +(bet * multiplier - bet).toFixed(2)

  return (
    <div className="mines-page">
      <div className="mines-header">
        <h2 className="mines-title">💣 {t("mines")}</h2>
        {isPlaying && (
          <div className="mines-stats">
            <div className="mines-stat">
              <span className="mines-stat-label">{t("mines_mult")}</span>
              <span className="mines-stat-value mult">{multiplier.toFixed(2)}×</span>
            </div>
            <div className="mines-stat">
              <span className="mines-stat-label">{t("mines_profit")}</span>
              <span className="mines-stat-value profit">+{profit.toFixed(2)} TON</span>
            </div>
          </div>
        )}
      </div>

      <div className="mines-grid">
        {Array.from({ length: GRID }).map((_, i) => {
          const isOpen = opened.includes(i)
          const isBomb = bombs?.includes(i)
          const isLastBomb = finished === "lost" && isBomb && isOpen
          const cls = [
            "mines-cell",
            isOpen ? "opened" : "",
            isBomb && bombs ? "bomb" : "",
            isLastBomb ? "boom" : "",
            isOpen && !isBomb ? "safe" : "",
          ].filter(Boolean).join(" ")
          return (
            <button
              key={i}
              className={cls}
              disabled={!isPlaying || busy || isOpen || !!bombs}
              onClick={() => open(i)}
            >
              {isBomb && bombs ? "💣" : isOpen ? "💎" : ""}
            </button>
          )
        })}
      </div>

      {!isPlaying && (
        <>
          <div className="mines-section">
            <div className="mines-section-title">{t("mines_bet")}</div>
            <div className="mines-presets">
              {BET_PRESETS.map((p) => (
                <button key={p} className={`mines-chip ${bet === p ? "active" : ""}`}
                  onClick={() => { setBet(p); haptic("light") }}>{p}</button>
              ))}
              <input className="mines-input" type="number" step="0.1" min="0.1" value={bet}
                onChange={(e) => setBet(Math.max(0.1, Number(e.target.value) || 0.1))} />
            </div>
          </div>

          <div className="mines-section">
            <div className="mines-section-title">{t("mines_count")}: <b>{minesCount}</b></div>
            <div className="mines-presets">
              {PRESETS.map((p) => (
                <button key={p} className={`mines-chip ${minesCount === p ? "active" : ""}`}
                  onClick={() => { setMinesCount(p); haptic("light") }}>{p}</button>
              ))}
            </div>
            <div className="mines-hint">
              {t("mines_first_payout")}: <b>{computeNextMultiplier(0, minesCount).toFixed(2)}×</b>
              {" → "}
              {t("mines_max")}: <b>{computeNextMultiplier(GRID - minesCount - 1, minesCount).toFixed(0)}×</b>
            </div>
          </div>

          <button className="mines-start" disabled={busy} onClick={start}>
            {finished === "won" ? "🎰 " + t("mines_play_again") :
             finished === "lost" ? "🔄 " + t("mines_retry") :
             "▶️ " + t("mines_play") + " " + bet + " TON"}
          </button>
        </>
      )}

      {isPlaying && (
        <div className="mines-actions">
          <button className="mines-cashout" disabled={busy || opened.length === 0} onClick={cashout}>
            💰 {t("mines_cashout")} +{profit.toFixed(2)} TON
          </button>
          {opened.length > 0 && (
            <div className="mines-next">
              {t("mines_next_mult")}: <b>{nextMultiplier.toFixed(2)}×</b>
            </div>
          )}
        </div>
      )}

      {error && <div className="mines-error">{error}</div>}
      {toast && <div className="toast top">{toast}</div>}
    </div>
  )
}

// Client-side preview of multiplier after k safe opens with m mines.
function computeNextMultiplier(safeOpened: number, mines: number) {
  const n = GRID
  const k = safeOpened + 1
  let p = 1
  for (let i = 0; i < k; i++) p *= (n - mines - i) / (n - i)
  return (1 / p) * 0.96
}
