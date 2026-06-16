import { useEffect, useState } from "react"
import { TonConnectButton, TonConnectUIProvider } from "@tonconnect/ui-react"
import { initTelegram, getUser } from "./telegram"
import { api } from "./api"
import { CrashGame } from "./CrashGame"
import "./styles.css"

const MANIFEST_URL = "https://your-domain.com/tonconnect-manifest.json"

function Inner() {
  const [balance, setBalance] = useState<number | null>(null)
  const user = getUser()

  useEffect(() => {
    initTelegram()
    api.getBalance().then((r) => setBalance(r.balance)).catch(() => setBalance(0))
  }, [])

  return (
    <div className="app">
      <header>
        <div>
          <div className="hello">Привет, {user?.first_name ?? "игрок"}</div>
          <div className="balance">Баланс: {balance ?? "..."} TON</div>
        </div>
        <TonConnectButton />
      </header>
      <CrashGame />
    </div>
  )
}

export default function App() {
  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <Inner />
    </TonConnectUIProvider>
  )
}
