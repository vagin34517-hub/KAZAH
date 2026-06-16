export const tg = (window as any).Telegram?.WebApp

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  try { tg.setHeaderColor?.("#0e0f13") } catch {}
  try { tg.setBackgroundColor?.("#0e0f13") } catch {}
}

export function getInitData(): string { return tg?.initData ?? "" }
export function getUser() { return tg?.initDataUnsafe?.user ?? null }
export function getStartParam(): string { return tg?.initDataUnsafe?.start_param ?? "" }

export function haptic(kind: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  try {
    const hf = tg?.HapticFeedback
    if (!hf) return
    if (kind === "success" || kind === "warning" || kind === "error") hf.notificationOccurred(kind)
    else hf.impactOccurred(kind)
  } catch {}
}

export function shareToTelegram(url: string, text: string) {
  const u = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text)
  try { tg?.openTelegramLink?.(u) } catch { window.open(u, "_blank") }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true }
  } catch {}
  try {
    const ta = document.createElement("textarea")
    ta.value = text; document.body.appendChild(ta); ta.select()
    document.execCommand("copy"); document.body.removeChild(ta); return true
  } catch { return false }
}
