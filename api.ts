import { getInitData, getStartParam } from "./telegram"

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ""

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
      "X-Start-Param": getStartParam(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let err = `API ${path} failed: ${res.status}`
    try { const j = await res.json(); if (j?.error) err = j.error } catch {}
    throw new Error(err)
  }
  return res.json() as Promise<T>
}

export type MeInfo = {
  userId: number; name: string; balance: number; online: number;
  level: number; xp: number; xpNext: number; refs: number; refBalance: number;
  inviteUrl: string;
  photo?: string | null;
  username?: string | null;
  activeNow?: number;
  totalPlayers?: number;
}
export type Player = {
  userId: number;
  name: string;
  bet: number;
  multiplier?: number;
  payout?: number;
  status: "playing" | "cashed" | "lost";
  photo?: string | null;
  username?: string | null;
  level?: number;
}
export type HistoryItem = { roundId: string; crashPoint: number }
export type DepositInfo = { address: string; comment: string; minTon: number; enabled: boolean }
export type GameState = {
  phase: "waiting" | "running" | "crashed"
  multiplier: number
  crashPoint?: number
  serverNow: number
  players: Player[]
}

export type MinesStart = { gameId: string; multiplier: number; opened: number[]; mines: number }
export type MinesOpen = { ok: boolean; hit: boolean; multiplier: number; opened: number[]; mines?: number[]; payout?: number; autoCashout?: boolean }
export type MinesCashout = { payout: number; multiplier: number; mines: number[] }
export type MinesActive = { game: null | { gameId: string; bet: number; mines: number; multiplier: number; opened: number[] } }

export type WithdrawInfo = {
  balance: number
  min: number
  max: number
  fee: number
  wagerRequirement: number
  totalDeposited: number
  canWithdraw: boolean
}
export type WithdrawItem = {
  id: number
  amount: number
  fee: number
  address: string
  status: "pending" | "approved" | "rejected"
  txHash: string | null
  reason: string | null
  createdAt: number
  processedAt: number | null
}

export const api = {
  me: () => request<MeInfo>("/api/me"),
  history: () => request<{ items: HistoryItem[] }>("/api/history"),
  players: () => request<{ players: Player[] }>("/api/players"),
  state: () => request<GameState>("/api/state"),
  depositInfo: () => request<DepositInfo>("/api/deposit/info"),
  placeBet: (amount: number) => request<{ betId: string }>("/api/bet", { amount }),
  cashout: (betId: string) => request<{ payout: number }>("/api/cashout", { betId }),
  minesStart: (bet: number, mines: number) => request<MinesStart>("/api/mines/start", { bet, mines }),
  minesOpen: (gameId: string, cell: number) => request<MinesOpen>("/api/mines/open", { gameId, cell }),
  minesCashout: (gameId: string) => request<MinesCashout>("/api/mines/cashout", { gameId }),
  minesActive: () => request<MinesActive>("/api/mines/active"),

  withdrawInfo: () => request<WithdrawInfo>("/api/withdraw/info"),
  withdrawRequest: (amount: number, address: string) =>
    request<{ ok: true; id: number }>("/api/withdraw/request", { amount, address }),
  withdrawList: () => request<{ items: WithdrawItem[] }>("/api/withdraw/list"),

  giftsCatalog: () => request<{ items: GiftCatalogItem[]; multipliers: number[]; sellFee: number; maxLevel: number }>("/api/gifts/catalog"),
  giftsInventory: () => request<{ items: OwnedGift[]; totalValue: number; balance: number }>("/api/gifts/inventory"),
  giftsBuy: (giftId: string) => request<{ ok: true; ownedId: number; newBalance: number; gift: OwnedGift }>("/api/gifts/buy", { giftId }),
  giftsUpgrade: (ownedId: number, multiplier: number) =>
    request<GiftUpgradeResult>("/api/gifts/upgrade", { ownedId, multiplier }),
  giftsSell: (ownedId: number) =>
    request<{ ok: true; payout: number; fee: number; newBalance: number }>("/api/gifts/sell", { ownedId }),
}

export type GiftCatalogItem = {
  id: string
  slug?: string
  emoji: string
  image?: string
  name: string
  price: number
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  bg: string
}
export type OwnedGift = {
  id: number
  giftId: string
  catalog: GiftCatalogItem | null
  level: number
  value: number
  baseValue?: number
  createdAt?: number
  updatedAt?: number
}
export type GiftUpgradeResult = {
  ok: true
  success: boolean
  chance: number
  multiplier: number
  gift: OwnedGift
}

export function deriveWsUrl(): string {
  const explicit = (import.meta as any).env?.VITE_WS_URL
  if (explicit) return explicit
  let base = API_BASE
  if (!base) {
    base = (typeof window !== "undefined" ? window.location.origin : "")
  }
  if (!base) return ""
  return base.replace(/^http/, "ws").replace(/\/$/, "") + "/ws"
}
