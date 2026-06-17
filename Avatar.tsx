import { useState, type CSSProperties } from "react"

// Deterministic gradient picked by userId. Tuned to look premium against
// the dark UI — saturated but not neon.
const GRADIENTS: [string, string][] = [
  ["#ff7a00", "#ff3d57"],
  ["#7c3aed", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#22c55e", "#10b981"],
  ["#f59e0b", "#ef4444"],
  ["#8b5cf6", "#6366f1"],
  ["#14b8a6", "#06b6d4"],
  ["#f43f5e", "#ec4899"],
  ["#0ea5e9", "#8b5cf6"],
  ["#eab308", "#f97316"],
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function pickGradient(userId: number | string): [string, string] {
  const n = Math.abs(Number(userId) | 0) || hashString(String(userId))
  return GRADIENTS[n % GRADIENTS.length]
}
function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar(props: {
  userId: number | string
  name?: string | null
  photo?: string | null
  size?: number
  online?: boolean
  level?: number
  className?: string
  ring?: boolean
}) {
  const { userId, name, photo, size = 40, online = false, level, className = "", ring = false } = props
  const [failed, setFailed] = useState(false)
  const grad = pickGradient(userId)
  const showImg = !!photo && !failed
  const fontSize = Math.max(11, Math.floor(size * 0.4))

  const wrapStyle: CSSProperties = { width: size, height: size }
  const circleStyle: CSSProperties = {
    width: size,
    height: size,
    background: showImg ? "#1a1a1a" : `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`,
    fontSize: fontSize,
  }

  return (
    <div className={`avatar-wrap ${ring ? "ring" : ""} ${className}`} style={wrapStyle}>
      <div className="avatar-circle" style={circleStyle}>
        {showImg ? (
          <img
            src={photo as string}
            alt={name || ""}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {online ? <span className="avatar-dot" /> : null}
      {typeof level === "number" && level > 1 ? (
        <span className="avatar-lvl">{level}</span>
      ) : null}
    </div>
  )
}
