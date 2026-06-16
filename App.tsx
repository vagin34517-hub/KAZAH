import { useEffect, useRef, useState } from "react"
import { api } from "./api"

type Phase = "waiting" | "running" | "crashed"

const WS_URL = import.meta.env.VITE_WS_URL ?? "wss://api.example.com/ws"

export function CrashGame() {
  const [phase, setPhase] = useState<Phase>("waiting")
  const [multiplier, setMultiplier] = useState(1.0)
  const [bet, setBet] = useState(1)
  const [betId, setBetId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === "tick") {
        setPhase("running")
        setMultiplier(msg.multiplier)
      } else if (msg.type === "crash") {
        setPhase("crashed")
        setMultiplier(msg.crashPoint)
        setBetId(null)
      } else if (msg.type === "waiting") {
        setPhase("waiting")
        setMultiplier(1.0)
      }
    }
    return () => ws.close()
  }, [])

  async function onBet() {
    try {
      const { betId } = await api.placeBet(bet)
      setBetId(betId)
      setMessage(`Ставка ${bet} TON принята`)
    } catch {
      setMessage("Ошибка ставки")
    }
  }

  async function onCashout() {
    if (!betId) return
    try {
      const { payout } = await api.cashout(betId)
      setMessage(`Выведено: ${payout} TON`)
      setBetId(null)
    } catch {
      setMessage("Не успел вывести")
    }
  }

  return (
    <div className="crash">
      <div className={`multiplier ${phase}`}>{multiplier.toFixed(2)}x</div>
      <div className="status">
        {phase === "waiting" && "Ожидание раунда..."}
        {phase === "running" && "Летим 🚀"}
        {phase === "crashed" && "Краш 💥"}
      </div>
      <div className="controls">
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        {!betId ? (
          <button disabled={phase !== "waiting"} onClick={onBet}>Ставка</button>
        ) : (
          <button disabled={phase !== "running"} onClick={onCashout}>Забрать</button>
        )}
      </div>
      {message && <div className="message">{message}</div>}
    </div>
  )
}
