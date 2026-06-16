import { getInitData } from "./telegram"

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://api.example.com"

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

export const api = {
  getBalance: () => request<{ balance: number }>("/me/balance"),
  placeBet: (amount: number) => request<{ betId: string }>("/game/bet", { amount }),
  cashout: (betId: string) => request<{ payout: number }>("/game/cashout", { betId }),
}
