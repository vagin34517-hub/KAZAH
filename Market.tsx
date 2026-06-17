import { useEffect, useMemo, useRef, useState } from "react"
import { api, type GiftCatalogItem, type OwnedGift } from "./api"
import { haptic } from "./telegram"
import { useT } from "./i18n"

type Tab = "shop" | "inventory" | "upgrade"

// Renders gift artwork: image from Telegram Fragment CDN with emoji fallback if image fails.
function GiftArt({ src, emoji, mini }: { src?: string; emoji: string; mini?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={"gift-art" + (mini ? " mini" : "")}>
      {src && !failed ? (
        <img
          className="gift-art-img"
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="gift-art-emoji">{emoji}</span>
      )}
    </div>
  )
}

export function Market() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>("shop")
  const [catalog, setCatalog] = useState<GiftCatalogItem[]>([])
  const [multipliers, setMultipliers] = useState<number[]>([1.5, 2, 3, 5, 10, 20])
  const [sellFee, setSellFee] = useState(0.05)
  const [inventory, setInventory] = useState<OwnedGift[]>([])
  const [balance, setBalance] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(null)

  function showToast(text: string, kind: "ok" | "err" = "ok") {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 2200)
  }

  async function reloadInventory() {
    try {
      const r = await api.giftsInventory()
      setInventory(r.items)
      setBalance(r.balance)
      setTotalValue(r.totalValue)
    } catch {}
  }

  useEffect(() => {
    api.giftsCatalog().then((r) => {
      setCatalog(r.items)
      setMultipliers(r.multipliers)
      setSellFee(r.sellFee)
    }).catch(() => {})
    reloadInventory()
  }, [])

  async function onBuy(g: GiftCatalogItem) {
    if (busy) return
    if (balance < g.price) { showToast(t("gift_insufficient"), "err"); haptic("error"); return }
    setBusy("buy:" + g.id)
    haptic("medium")
    try {
      const r = await api.giftsBuy(g.id)
      setBalance(r.newBalance)
      showToast(t("gift_bought") + " " + g.emoji, "ok")
      haptic("success")
      reloadInventory()
    } catch (e: any) {
      showToast(e?.message || "error", "err")
      haptic("error")
    } finally { setBusy(null) }
  }

  async function onSell(g: OwnedGift) {
    if (busy) return
    if (!confirm(t("gift_sell_confirm").replace("{v}", (g.value * (1 - sellFee)).toFixed(2)))) return
    setBusy("sell:" + g.id)
    haptic("medium")
    try {
      const r = await api.giftsSell(g.id)
      setBalance(r.newBalance)
      showToast(t("gift_sold") + " +" + r.payout.toFixed(2) + " TON", "ok")
      haptic("success")
      reloadInventory()
    } catch (e: any) {
      showToast(e?.message || "error", "err")
      haptic("error")
    } finally { setBusy(null) }
  }

  return (
    <div className="market-wrap">
      <div className="market-stats">
        <div className="market-stat">
          <span className="ms-label">{t("balance")}</span>
          <span className="ms-val">{balance.toFixed(2)} TON</span>
        </div>
        <div className="market-stat">
          <span className="ms-label">{t("gift_inv_value")}</span>
          <span className="ms-val">{totalValue.toFixed(2)} TON</span>
        </div>
        <div className="market-stat">
          <span className="ms-label">{t("gift_items")}</span>
          <span className="ms-val">{inventory.length}</span>
        </div>
      </div>

      <div className="market-tabs">
        {(["shop", "inventory", "upgrade"] as Tab[]).map((id) => (
          <button
            key={id}
            className={"mt-btn " + (tab === id ? "active" : "")}
            onClick={() => { haptic("light"); setTab(id) }}
          >
            {t("gift_tab_" + id)}
          </button>
        ))}
      </div>

      {tab === "shop" && (
        <div className="gift-grid">
          {catalog.map((g) => {
            const cant = balance < g.price
            return (
              <div
                key={g.id}
                className={"gift-card rarity-" + g.rarity + (cant ? " disabled" : "")}
                style={{ "--gift-bg": g.bg } as React.CSSProperties}
                onClick={() => onBuy(g)}
              >
                <GiftArt src={g.image} emoji={g.emoji} />
                <div className="gift-name">{g.name}</div>
                <div className="gift-price">{g.price} TON</div>
                <div className="gift-rarity-badge">{t("rar_" + g.rarity)}</div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "inventory" && (
        <div className="gift-grid">
          {inventory.length === 0 && (
            <div className="gift-empty">{t("gift_inv_empty")}</div>
          )}
          {inventory.map((g) => {
            const cat = g.catalog
            if (!cat) return null
            return (
              <div
                key={g.id}
                className={"gift-card owned rarity-" + cat.rarity}
                style={{ "--gift-bg": cat.bg } as React.CSSProperties}
              >
                {g.level > 1 && <div className="gift-level">L{g.level}</div>}
                <GiftArt src={cat.image} emoji={cat.emoji} />
                <div className="gift-name">{cat.name}</div>
                <div className="gift-value">{g.value.toFixed(2)} TON</div>
                <button
                  className="gift-sell-btn"
                  disabled={busy === "sell:" + g.id}
                  onClick={(e) => { e.stopPropagation(); onSell(g) }}
                >
                  {t("gift_sell")} {(g.value * (1 - sellFee)).toFixed(2)}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tab === "upgrade" && (
        <UpgradePanel
          inventory={inventory}
          multipliers={multipliers}
          onChanged={reloadInventory}
          showToast={showToast}
          busy={busy}
          setBusy={setBusy}
        />
      )}

      {toast && (
        <div className={"market-toast " + toast.kind}>{toast.text}</div>
      )}
    </div>
  )
}

// ============================================================================
function UpgradePanel({
  inventory, multipliers, onChanged, showToast, busy, setBusy,
}: {
  inventory: OwnedGift[]
  multipliers: number[]
  onChanged: () => void
  showToast: (text: string, kind?: "ok" | "err") => void
  busy: string | null
  setBusy: (s: string | null) => void
}) {
  const { t } = useT()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mult, setMult] = useState<number>(multipliers[1] || 2)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<null | { success: boolean; value: number; chance: number; mult: number }>(null)
  const spinnerRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(() => inventory.find((g) => g.id === selectedId) || null, [inventory, selectedId])
  useEffect(() => {
    if (selectedId && !inventory.find((g) => g.id === selectedId)) setSelectedId(null)
  }, [inventory, selectedId])

  // Approximate displayed chance (server has authority; ~10% house edge).
  const approxChance = Math.max(2, Math.min(95, Math.round((95 / mult) * 0.9)))

  async function onSpin() {
    if (!selected || spinning || busy) return
    setSpinning(true)
    setResult(null)
    setBusy("upgrade:" + selected.id)
    haptic("medium")
    try {
      const r = await api.giftsUpgrade(selected.id, mult)
      // Animate spinner needle for ~1.4s then reveal result.
      const targetPct = r.success ? r.chance * 100 * 0.5 : 100 - (1 - r.chance) * 100 * 0.5
      if (spinnerRef.current) {
        spinnerRef.current.style.setProperty("--spin-target", `${Math.min(98, Math.max(2, targetPct))}%`)
        spinnerRef.current.classList.remove("spinning")
        // restart animation
        void spinnerRef.current.offsetWidth
        spinnerRef.current.classList.add("spinning")
      }
      setTimeout(() => {
        setResult({ success: r.success, value: r.gift.value, chance: r.chance, mult: r.multiplier })
        haptic(r.success ? "success" : "error")
        showToast(r.success ? t("gift_up_win") : t("gift_up_lose"), r.success ? "ok" : "err")
        if (r.success) setSelectedId(r.gift.id); else setSelectedId(null)
        onChanged()
        setSpinning(false)
        setBusy(null)
      }, 1400)
    } catch (e: any) {
      showToast(e?.message || "error", "err")
      haptic("error")
      setSpinning(false)
      setBusy(null)
    }
  }

  return (
    <div className="upgrade-panel">
      <div className="up-target">
        {selected && selected.catalog ? (
          <div className={"gift-card preview rarity-" + selected.catalog.rarity} style={{ "--gift-bg": selected.catalog.bg } as React.CSSProperties}>
            {selected.level > 1 && <div className="gift-level">L{selected.level}</div>}
            <GiftArt src={selected.catalog.image} emoji={selected.catalog.emoji} />
            <div className="gift-name">{selected.catalog.name}</div>
            <div className="gift-value">{selected.value.toFixed(2)} TON</div>
          </div>
        ) : (
          <div className="up-pick-hint">{t("gift_up_pick")}</div>
        )}
        <div className="up-arrow">{result?.success ? "\u2728" : result && !result.success ? "\ud83d\udca5" : "\u2192"}</div>
        <div className={"up-reward " + (result ? (result.success ? "win" : "lose") : "")}>
          {selected ? (
            <>
              <div className="up-reward-mult">×{mult}</div>
              <div className="up-reward-val">{(selected.value * mult).toFixed(2)} TON</div>
              <div className="up-reward-chance">{approxChance}% {t("gift_chance")}</div>
            </>
          ) : (
            <div className="up-reward-empty">—</div>
          )}
        </div>
      </div>

      <div className="up-spinner-wrap">
        <div ref={spinnerRef} className="up-spinner">
          <div className="up-spinner-track">
            <div className="up-spinner-fill" style={{ width: `${approxChance}%` }} />
          </div>
          <div className="up-spinner-needle" />
        </div>
        <div className="up-spinner-labels">
          <span>{t("gift_win")} {approxChance}%</span>
          <span>{t("gift_lose")} {100 - approxChance}%</span>
        </div>
      </div>

      <div className="up-mults">
        {multipliers.map((m) => (
          <button
            key={m}
            className={"up-mult " + (mult === m ? "active" : "")}
            onClick={() => { haptic("light"); setMult(m) }}
          >×{m}</button>
        ))}
      </div>

      <button
        className="up-go-btn"
        disabled={!selected || spinning || (busy !== null)}
        onClick={onSpin}
      >
        {spinning ? t("gift_spinning") : t("gift_upgrade")}
      </button>

      <div className="up-inv-label">{t("gift_pick_from_inv")}</div>
      <div className="gift-grid mini">
        {inventory.length === 0 && (
          <div className="gift-empty">{t("gift_inv_empty")}</div>
        )}
        {inventory.map((g) => {
          const cat = g.catalog
          if (!cat) return null
          return (
            <div
              key={g.id}
              className={"gift-card mini rarity-" + cat.rarity + (selectedId === g.id ? " picked" : "")}
              style={{ "--gift-bg": cat.bg } as React.CSSProperties}
              onClick={() => { haptic("light"); setSelectedId(g.id); setResult(null) }}
            >
              {g.level > 1 && <div className="gift-level">L{g.level}</div>}
              <GiftArt src={cat.image} emoji={cat.emoji} mini />
              <div className="gift-value">{g.value.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
