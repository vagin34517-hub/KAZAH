export const tg = (window as any).Telegram?.WebApp

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
}

export function getInitData(): string {
  return tg?.initData ?? ""
}

export function getUser() {
  return tg?.initDataUnsafe?.user ?? null
}
