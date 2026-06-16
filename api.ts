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
}
export type Player = { userId: number; name: string; bet: number; multiplier?: number; payout?: number; status: "playing" | "cashed" | "lost" }
export type HistoryItem = { roundId: string; crashPoint: number }
export type DepositInfo = { address: string; comment: string; minTon: number; enabled: boolean }
export type GameState = {
  phase: "waiting" | "running" | "crashed"
  multiplier: number
  crashPoint?: number
  serverNow: number
  players: Player[]
}

export const api = {
  me: () => request<MeInfo>("/api/me"),
  history: () => request<{ items: HistoryItem[] }>("/api/history"),
  players: () => request<{ players: Player[] }>("/api/players"),
  state: () => request<GameState>("/api/state"),
  depositInfo: () => request<DepositInfo>("/api/deposit/info"),
  placeBet: (amount: number) => request<{ betId: string }>("/api/bet", { amount }),
  cashout: (betId: string) => request<{ payout: number }>("/api/cashout", { betId }),
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
