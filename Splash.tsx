import React, { useEffect, useState } from "react"

type Props = { onDone: () => void }

export function Splash({ onDone }: Props) {
  const [phase, setPhase] = useState<"intro" | "launch" | "fade">("intro")
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("launch"), 700)
    const t2 = setTimeout(() => setPhase("fade"), 1700)
    const t3 = setTimeout(() => onDone(), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div className={"splash-root " + phase}>
      <div className="splash-stars">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="splash-star"
            style={{
              left: ((i * 53) % 100) + "%",
              top: ((i * 91) % 100) + "%",
              animationDelay: ((i * 137) % 2000) + "ms",
              animationDuration: 1200 + ((i * 73) % 1800) + "ms",
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="splash-stage">
        <div className="splash-rocket-wrap">
          <svg className="splash-rocket" viewBox="0 0 48 80" width="110" height="180">
            <defs>
              <linearGradient id="sBody" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#b8c2d4" />
                <stop offset="40%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#7a8398" />
              </linearGradient>
              <linearGradient id="sNose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6a7d" />
                <stop offset="100%" stopColor="#b82a40" />
              </linearGradient>
              <radialGradient id="sWindow" cx="0.35" cy="0.35" r="0.7">
                <stop offset="0%" stopColor="#a8e8ff" />
                <stop offset="60%" stopColor="#36b1ff" />
                <stop offset="100%" stopColor="#0a3a6a" />
              </radialGradient>
              <radialGradient id="sFlame" cx="0.5" cy="0.1" r="0.95">
                <stop offset="0%" stopColor="#fffae0" />
                <stop offset="30%" stopColor="#ffd166" />
                <stop offset="65%" stopColor="#ff8a3c" />
                <stop offset="100%" stopColor="#ff4757" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse className="splash-flame splash-flame-outer" cx="24" cy="74" rx="10" ry="9" fill="url(#sFlame)" />
            <ellipse className="splash-flame splash-flame-inner" cx="24" cy="70" rx="5.5" ry="4.5" fill="#fffae0" opacity="0.95" />
            <path d="M14 48 L4 66 L17 58 Z" fill="#c8344a" stroke="#7a1626" strokeWidth="0.6" />
            <path d="M34 48 L44 66 L31 58 Z" fill="#c8344a" stroke="#7a1626" strokeWidth="0.6" />
            <path d="M16 18 Q16 6 24 2 Q32 6 32 18 L32 60 L16 60 Z" fill="url(#sBody)" stroke="#5a6478" strokeWidth="0.8" />
            <path d="M16 18 Q16 6 24 2 Q32 6 32 18 Z" fill="url(#sNose)" stroke="#7a1626" strokeWidth="0.5" />
            <rect x="16" y="42" width="16" height="3" fill="#ff5a6c" opacity="0.85" />
            <circle cx="24" cy="26" r="5" fill="url(#sWindow)" stroke="#0d3a5e" strokeWidth="0.9" />
            <ellipse cx="22" cy="24" rx="1.6" ry="1" fill="rgba(255,255,255,0.85)" />
            <rect x="18" y="60" width="12" height="5" fill="#3a4050" rx="1" />
          </svg>
          <div className="splash-smoke s1" />
          <div className="splash-smoke s2" />
          <div className="splash-smoke s3" />
        </div>

        <div className="splash-logo">KAZAH</div>
        <div className="splash-tag">TON · Crash · Mines</div>

        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  )
}
