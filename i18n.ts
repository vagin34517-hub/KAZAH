import { useEffect, useState } from "react"

export type Lang = "ru" | "en" | "ua"

const dict: Record<Lang, Record<string, string>> = {
  ru: {
    crash: "Краш", cases: "Кейсы", season: "Сезон", profile: "Профиль",
    waiting: "Ожидание", place_bet: "Сделать ставку", cashout: "Забрать",
    waiting_bets: "Ожидание ставок", no_one_playing: "Пока никто не играет",
    settings: "Настройки", skin: "Скин", background: "Фон", language: "Язык",
    sound: "Звук", vibration: "Вибрация", close: "Закрыть",
    topup: "Пополнить", rewards: "Награды", level: "уровень",
    referrals: "РЕФЕРАЛЫ", referrals_desc: "Приглашайте друзей и получайте 10% с депозитов ваших друзей!",
    balance: "Баланс", refs_count: "Рефералов", terms: "Условия",
    invite_friends: "Пригласить друзей", copy_link: "Копировать ссылку", link_copied: "скопировано",
    inventory_empty: "Инвентарь пуст", coming_soon: "Скоро",
    crashed: "Краш", bet_accepted: "Ставка принята", withdrew: "Выведено",
    bet_error: "Ошибка ставки", too_late: "Не успел вывести",
    topup_soon: "Пополнение пока не настроено. Попроси админа начислить вручную.",
    dep_step_1: "Скопируй адрес кошелька",
    dep_step_2: "ОБЯЗАТЕЛЬНО в комментарии укажи свой код",
    dep_step_3: "Отправь TON с любого кошелька",
    dep_address: "Адрес кошелька", dep_comment: "Комментарий (важно!)",
    dep_open_wallet: "Открыть кошелёк",
    dep_hint: "Баланс начисляется автоматически в течение 1 минуты после подтверждения транзакции.",
  },
  en: {
    crash: "Crash", cases: "Cases", season: "Season", profile: "Profile",
    waiting: "Waiting", place_bet: "Place bet", cashout: "Cash out",
    waiting_bets: "Waiting for bets", no_one_playing: "No one is playing yet",
    settings: "Settings", skin: "Skin", background: "Background", language: "Language",
    sound: "Sound", vibration: "Vibration", close: "Close",
    topup: "Top up", rewards: "Rewards", level: "level",
    referrals: "REFERRALS", referrals_desc: "Invite friends and get 10% of their deposits!",
    balance: "Balance", refs_count: "Referrals", terms: "Terms",
    invite_friends: "Invite friends", copy_link: "Copy link", link_copied: "copied",
    inventory_empty: "Inventory is empty", coming_soon: "Coming soon",
    crashed: "Crash", bet_accepted: "Bet placed", withdrew: "Cashed out",
    bet_error: "Bet error", too_late: "Too late",
    topup_soon: "Deposits are not configured yet. Ask admin to credit manually.",
    dep_step_1: "Copy the wallet address",
    dep_step_2: "YOU MUST add your code as a comment",
    dep_step_3: "Send TON from any wallet",
    dep_address: "Wallet address", dep_comment: "Comment (required!)",
    dep_open_wallet: "Open wallet",
    dep_hint: "Balance will be credited automatically within 1 minute after the tx is confirmed.",
  },
  ua: {
    crash: "Креш", cases: "Кейси", season: "Сезон", profile: "Профіль",
    waiting: "Очікування", place_bet: "Зробити ставку", cashout: "Забрати",
    waiting_bets: "Очікування ставок", no_one_playing: "Поки ніхто не грає",
    settings: "Налаштування", skin: "Скін", background: "Фон", language: "Мова",
    sound: "Звук", vibration: "Вібрація", close: "Закрити",
    topup: "Поповнити", rewards: "Нагороди", level: "рівень",
    referrals: "РЕФЕРАЛИ", referrals_desc: "Запрошуйте друзів і отримуйте 10% від депозитів!",
    balance: "Баланс", refs_count: "Рефералів", terms: "Умови",
    invite_friends: "Запросити друзів", copy_link: "Копіювати посилання", link_copied: "скопійовано",
    inventory_empty: "Інвентар порожній", coming_soon: "Скоро",
    crashed: "Креш", bet_accepted: "Ставку прийнято", withdrew: "Виведено",
    bet_error: "Помилка ставки", too_late: "Не встиг вивести",
    topup_soon: "Поповнення не налаштовано. Попросіть адміна нарахувати вручну.",
    dep_step_1: "Скопіюйте адресу гаманця",
    dep_step_2: "ОБОВ'ЯЗКОВО вкажіть ваш код у коментарі",
    dep_step_3: "Відправте TON з будь-якого гаманця",
    dep_address: "Адреса гаманця", dep_comment: "Коментар (важливо!)",
    dep_open_wallet: "Відкрити гаманець",
    dep_hint: "Баланс буде зараховано автоматично протягом 1 хвилини після підтвердження.",
  },
}

const LS_KEY = "kazah.lang"
const listeners = new Set<(l: Lang) => void>()
let current: Lang = (typeof localStorage !== "undefined" && (localStorage.getItem(LS_KEY) as Lang)) || "ru"

export function getLang(): Lang { return current }
export function setLang(l: Lang) {
  current = l
  try { localStorage.setItem(LS_KEY, l) } catch {}
  listeners.forEach((cb) => cb(l))
}

export function useT() {
  const [lang, setLangState] = useState<Lang>(current)
  useEffect(() => {
    const cb = (l: Lang) => setLangState(l)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])
  const t = (key: string) => dict[lang]?.[key] ?? dict.ru[key] ?? key
  return { t, lang, setLang }
}

export const LANGS: { id: Lang; flag: string; name: string }[] = [
  { id: "ru", flag: "🇷🇺", name: "Русский" },
  { id: "en", flag: "🇬🇧", name: "English" },
  { id: "ua", flag: "🇺🇦", name: "Українська" },
]
