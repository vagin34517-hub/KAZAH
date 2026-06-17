import { useEffect, useState } from "react"

export type Lang = "ru" | "en" | "ua"

const dict: Record<Lang, Record<string, string>> = {
  ru: {
    crash: "Краш", cases: "Кейсы", mines: "Мины", market: "Подарки", season: "Сезон", leaderboard: "Топ", profile: "Профиль",
    gift_tab_shop: "Магазин", gift_tab_inventory: "Инвентарь", gift_tab_upgrade: "Апгрейд",
    gift_inv_empty: "Подарков пока нет — купи в магазине", gift_inv_value: "Стоимость инвентаря", gift_items: "Подарков",
    gift_sell: "Продать", gift_sell_confirm: "Продать подарок за {v} TON?",
    gift_bought: "Куплено", gift_sold: "Продано", gift_insufficient: "Недостаточно TON на балансе",
    gift_up_pick: "Выбери подарок для апгрейда", gift_pick_from_inv: "Подарки из инвентаря",
    gift_chance: "шанс", gift_win: "Выигрыш", gift_lose: "Сгорит", gift_upgrade: "Апгрейд", gift_spinning: "Крутим…",
    gift_up_win: "🎉 Апгрейд успешен!", gift_up_lose: "💥 Сгорел…",
    rar_common: "обычный", rar_uncommon: "необычный", rar_rare: "редкий", rar_epic: "эпик", rar_legendary: "легенда",
    lb_balance: "По балансу", lb_deposited: "По депам", lb_empty: "Ещё никто не отметился", lb_your_rank: "Твоё место",
    mines_bet: "Ставка", mines_count: "Кол-во мин", mines_mult: "Множитель", mines_profit: "Прибыль",
    mines_play: "Играть", mines_play_again: "Ещё раз", mines_retry: "Повторить", mines_cashout: "Забрать",
    mines_boom: "💥 Бум! Проиграл", mines_max: "Макс", mines_first_payout: "Первый пик", mines_next_mult: "След. открытие",
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
    wd_title: "Вывод", wd_new: "Новый вывод", wd_history: "История",
    wd_amount: "Сумма вывода (TON)", wd_address: "TON-адрес", wd_submit: "Запросить вывод",
    wd_pending: "в обработке", wd_approved: "выплачено", wd_rejected: "отклонено",
    wd_limits: "Лимиты", wd_fee: "Комиссия сети", wd_you_get: "Ты получишь", wd_total_deducted: "Спишется с баланса",
    wd_hint: "Заявка обрабатывается вручную в течение 1–24 часов. При отклонении баланс возвращается автоматически.",
    wd_no_history: "Заявок ещё не было",
    wd_bad_amount: "Неверная сумма", wd_bad_addr: "Введите TON-адрес", wd_submitted: "Заявка отправлена",
  },
  en: {
    crash: "Crash", cases: "Cases", mines: "Mines", market: "Gifts", season: "Season", leaderboard: "Top", profile: "Profile",
    gift_tab_shop: "Shop", gift_tab_inventory: "Inventory", gift_tab_upgrade: "Upgrade",
    gift_inv_empty: "No gifts yet — buy some in the shop", gift_inv_value: "Inventory value", gift_items: "Gifts",
    gift_sell: "Sell", gift_sell_confirm: "Sell this gift for {v} TON?",
    gift_bought: "Bought", gift_sold: "Sold", gift_insufficient: "Not enough TON",
    gift_up_pick: "Pick a gift to upgrade", gift_pick_from_inv: "From your inventory",
    gift_chance: "chance", gift_win: "Win", gift_lose: "Burn", gift_upgrade: "Upgrade", gift_spinning: "Spinning…",
    gift_up_win: "🎉 Upgrade succeeded!", gift_up_lose: "💥 Burned…",
    rar_common: "common", rar_uncommon: "uncommon", rar_rare: "rare", rar_epic: "epic", rar_legendary: "legendary",
    lb_balance: "By balance", lb_deposited: "By deposits", lb_empty: "No one is on the board yet", lb_your_rank: "Your rank",
    mines_bet: "Bet", mines_count: "Mines", mines_mult: "Multiplier", mines_profit: "Profit",
    mines_play: "Play", mines_play_again: "Play again", mines_retry: "Retry", mines_cashout: "Cash out",
    mines_boom: "💥 Boom! You lost", mines_max: "Max", mines_first_payout: "First pick", mines_next_mult: "Next pick",
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
    wd_title: "Withdraw", wd_new: "New", wd_history: "History",
    wd_amount: "Amount (TON)", wd_address: "TON address", wd_submit: "Request withdraw",
    wd_pending: "pending", wd_approved: "paid", wd_rejected: "rejected",
    wd_limits: "Limits", wd_fee: "Network fee", wd_you_get: "You receive", wd_total_deducted: "Deducted from balance",
    wd_hint: "Requests are processed manually within 1–24 hours. If rejected, balance is refunded automatically.",
    wd_no_history: "No withdrawals yet",
    wd_bad_amount: "Invalid amount", wd_bad_addr: "Enter a TON address", wd_submitted: "Request submitted",
  },
  ua: {
    crash: "Креш", cases: "Кейси", mines: "Міни", market: "Подарунки", season: "Сезон", leaderboard: "Топ", profile: "Профіль",
    gift_tab_shop: "Магазин", gift_tab_inventory: "Інвентар", gift_tab_upgrade: "Апгрейд",
    gift_inv_empty: "Подарунків ще немає — купи в магазині", gift_inv_value: "Вартість інвентаря", gift_items: "Подарунків",
    gift_sell: "Продати", gift_sell_confirm: "Продати подарунок за {v} TON?",
    gift_bought: "Куплено", gift_sold: "Продано", gift_insufficient: "Недостатньо TON",
    gift_up_pick: "Обери подарунок для апгрейду", gift_pick_from_inv: "З інвентаря",
    gift_chance: "шанс", gift_win: "Виграш", gift_lose: "Згорить", gift_upgrade: "Апгрейд", gift_spinning: "Крутимо…",
    gift_up_win: "🎉 Апгрейд успішний!", gift_up_lose: "💥 Згорів…",
    rar_common: "звичайний", rar_uncommon: "незвичайний", rar_rare: "рідкісний", rar_epic: "епік", rar_legendary: "легенда",
    lb_balance: "За балансом", lb_deposited: "За депами", lb_empty: "Ще ніхто не відзначився", lb_your_rank: "Твоє місце",
    mines_bet: "Ставка", mines_count: "К-ть мін", mines_mult: "Множник", mines_profit: "Прибуток",
    mines_play: "Грати", mines_play_again: "Ще раз", mines_retry: "Ретрай", mines_cashout: "Забрати",
    mines_boom: "💥 Бум! Програв", mines_max: "Макс", mines_first_payout: "Перший пік", mines_next_mult: "Наст. пік",
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
    wd_title: "Виведення", wd_new: "Нова заявка", wd_history: "Історія",
    wd_amount: "Сума (TON)", wd_address: "TON-адреса", wd_submit: "Запросити виведення",
    wd_pending: "в обробці", wd_approved: "виплачено", wd_rejected: "відхилено",
    wd_limits: "Ліміти", wd_fee: "Комісія мережі", wd_you_get: "Ти отримаєш", wd_total_deducted: "Спишеться з балансу",
    wd_hint: "Заявка опрацьовується вручну протягом 1–24 годин. При відхиленні баланс повертається автоматично.",
    wd_no_history: "Заявок ще не було",
    wd_bad_amount: "Невірна сума", wd_bad_addr: "Введіть TON-адресу", wd_submitted: "Заявку надіслано",
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
