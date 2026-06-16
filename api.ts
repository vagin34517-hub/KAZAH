import { getInitData } from "./telegram"

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ""

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export type MeInfo = { userId: number; name: string; balance: number; online: number }
export type Player = { userId: number; name: string; avatar?: string; bet: number; multiplier?: number; payout?: number; status: "playing" | "cashed" | "lost" }
export type HistoryItem = { roundId: string; crashPoint: number }

export const api = {
  me: () => request<MeInfo>("/api/me"),
  history: () => request<{ items: HistoryItem[] }>("/api/history"),
  players: () => request<{ players: Player[] }>("/api/players"),
  placeBet: (amount: number) => request<{ betId: string }>("/api/bet", { amount }),
  cashout: (betId: string) => request<{ payout: number }>("/api/cashout", { betId }),
}
