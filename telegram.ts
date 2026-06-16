export const tg = (window as any).Telegram?.WebApp

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  try { tg.setHeaderColor?.("#0e0f13") } catch {}
  try { tg.setBackgroundColor?.("#0e0f13") } catch {}
}

export function getInitData(): string {
  return tg?.initData ?? ""
}

export function getUser() {
  return tg?.initDataUnsafe?.user ?? null
}
