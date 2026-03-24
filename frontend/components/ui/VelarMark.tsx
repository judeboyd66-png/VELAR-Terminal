import type { CSSProperties } from 'react'

interface Props {
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
  color?: string
}

/** VELAR stacked-parallelogram logo mark */
export function VelarMark({ width = 28, height, className, style, color = 'currentColor' }: Props) {
  const h = height ?? (typeof width === 'number' ? Math.round((width as number) * 0.82) : undefined)
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 34 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Back layer */}
      <path
        d="M6 26 L32 16 L28 2 L2 12 Z"
        stroke={color} strokeWidth="0.75" strokeLinejoin="round" fill="none" opacity="0.22"
      />
      {/* Mid layer */}
      <path
        d="M4 22 L30 12 L26 -2 L0 8 Z"
        stroke={color} strokeWidth="0.9" strokeLinejoin="round" fill="none" opacity="0.52"
      />
      {/* Front layer */}
      <path
        d="M2 28 L28 18 L24 4 L-2 14 Z"
        stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill="none" opacity="1"
      />
      {/* Corner nodes */}
      <circle cx="2" cy="28" r="1.7" fill={color} opacity="1" />
      <circle cx="24" cy="4"  r="1.7" fill={color} opacity="1" />
      <circle cx="28" cy="18" r="1.1" fill={color} opacity="0.55" />
    </svg>
  )
}
