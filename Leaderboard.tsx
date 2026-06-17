import { useEffect, useState } from "react"
import { useT } from "./i18n"
import { Avatar } from "./Avatar"
import { haptic } from "./telegram"

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ""

type Metric = "balance" | "deposited"

type LbItem = {
  rank: number
  userId: number
  name: string
  photo: string | null
  username: string | null
  level: number
  value: number
}
type LbMe = { userId: number; rank: number; value: number }

type LbResponse = { metric: Metric; items: LbItem[]; me: LbMe | null }

import { getInitData, getStartParam } from "./telegram"

async function fetchLb(metric: Metric): Promise<LbResponse> {
  const res = await fetch(`${API_BASE}/api/leaderboard?metric=${metric}&limit=50`, {
    headers: {
      "X-Telegram-Init-Data": getInitData(),
      "X-Start-Param": getStartParam(),
    },
  })
  if (!res.ok) throw new Error("lb failed")
  return res.json()
}

function medal(rank: number) {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return null
}

export function Leaderboard({ myUserId }: { myUserId?: number }) {
  const { t } = useT()
  const [metric, setMetric] = useState<Metric>("balance")
  const [data, setData] = useState<LbResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLb(metric)
      .then(setData)
      .catch(() => setData({ metric, items: [], me: null }))
      .finally(() => setLoading(false))
  }, [metric])

  const top3 = data?.items.slice(0, 3) ?? []
  const rest = data?.items.slice(3) ?? []

  return (
    <div className="lb-page">
      <h2 className="page-title">🏆 {t("leaderboard")}</h2>

      <div className="lb-tabs">
        <button
          className={`lb-tab ${metric === "balance" ? "active" : ""}`}
          onClick={() => { haptic("light"); setMetric("balance") }}
        >💰 {t("lb_balance")}</button>
        <button
          className={`lb-tab ${metric === "deposited" ? "active" : ""}`}
          onClick={() => { haptic("light"); setMetric("deposited") }}
        >💸 {t("lb_deposited")}</button>
      </div>

      {loading && <div className="lb-empty">⏳</div>}
      {!loading && data && data.items.length === 0 && (
        <div className="lb-empty">{t("lb_empty")}</div>
      )}

      {!loading && top3.length > 0 && (
        <div className="lb-podium">
          {top3[1] && <PodiumCard item={top3[1]} place={2} me={myUserId === top3[1].userId} />}
          {top3[0] && <PodiumCard item={top3[0]} place={1} me={myUserId === top3[0].userId} />}
          {top3[2] && <PodiumCard item={top3[2]} place={3} me={myUserId === top3[2].userId} />}
        </div>
      )}

      {!loading && rest.length > 0 && (
        <div className="lb-list">
          {rest.map((it) => (
            <div key={it.userId} className={`lb-row ${myUserId === it.userId ? "me" : ""}`}>
              <div className="lb-rank">{medal(it.rank) || `#${it.rank}`}</div>
              <Avatar userId={it.userId} name={it.name} photo={it.photo} level={it.level} size={36} />
              <div className="lb-info">
                <div className="lb-name">{it.name}{it.username ? <span className="lb-uname"> @{it.username}</span> : null}</div>
                <div className="lb-lvl">lv {it.level}</div>
              </div>
              <div className="lb-value">💎 {it.value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {data?.me && data.me.rank > 50 && (
        <div className="lb-me-card">
          <div className="lb-me-label">{t("lb_your_rank")}</div>
          <div className="lb-me-row">
            <span className="lb-rank">#{data.me.rank}</span>
            <span className="lb-value">💎 {data.me.value.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PodiumCard({ item, place, me }: { item: LbItem; place: 1 | 2 | 3; me: boolean }) {
  return (
    <div className={`podium podium-${place} ${me ? "me" : ""}`}>
      <div className="podium-medal">{place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉"}</div>
      <Avatar userId={item.userId} name={item.name} photo={item.photo} level={item.level} size={place === 1 ? 64 : 52} ring={place === 1} />
      <div className="podium-name">{item.name}</div>
      <div className="podium-value">💎 {item.value.toFixed(2)}</div>
    </div>
  )
}
