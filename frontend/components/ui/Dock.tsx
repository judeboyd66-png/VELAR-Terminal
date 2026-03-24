'use client'

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion'
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

const DOCK_HEIGHT = 112
const DEFAULT_MAGNIFICATION = 68
const DEFAULT_DISTANCE = 130
const DEFAULT_PANEL_HEIGHT = 56

type DockProps = {
  children: React.ReactNode
  className?: string
  distance?: number
  panelHeight?: number
  magnification?: number
  spring?: SpringOptions
}
type DockItemProps = {
  className?: string
  children: React.ReactNode
}
type DockLabelProps = {
  className?: string
  children: React.ReactNode
}
type DockIconProps = {
  className?: string
  children: React.ReactNode
}
type DockContextType = {
  mouseX: MotionValue
  spring: SpringOptions
  magnification: number
  distance: number
}

const DockContext = createContext<DockContextType | undefined>(undefined)

function useDock() {
  const ctx = useContext(DockContext)
  if (!ctx) throw new Error('useDock must be used within Dock')
  return ctx
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 160, damping: 13 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = useMemo(
    () => Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4),
    [magnification],
  )

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)

  return (
    <motion.div
      style={{ height, scrollbarWidth: 'none' }}
      className="flex max-w-full items-end overflow-x-auto"
    >
      <motion.div
        onMouseMove={({ pageX }) => { isHovered.set(1); mouseX.set(pageX) }}
        onMouseLeave={() => { isHovered.set(0); mouseX.set(Infinity) }}
        className={cn(
          'mx-auto flex w-fit items-end gap-3 rounded-xl px-3',
          className,
        )}
        style={{
          height: panelHeight,
          background: 'rgba(17,17,20,0.88)',
          border: '1px solid var(--line)',
          backdropFilter: 'blur(24px) saturate(180%)',
        }}
        role="toolbar"
        aria-label="Terminal navigation"
      >
        <DockContext.Provider value={{ mouseX, spring, distance, magnification }}>
          {children}
        </DockContext.Provider>
      </motion.div>
    </motion.div>
  )
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { distance, magnification, mouseX, spring } = useDock()
  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - rect.x - rect.width / 2
  })

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [38, magnification, 38],
  )
  const width = useSpring(widthTransform, spring)

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={cn('relative inline-flex items-center justify-center', className)}
      tabIndex={0}
      role="button"
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement, { width, isHovered }),
      )}
    </motion.div>
  )
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>
  const isHovered = restProps['isHovered'] as MotionValue<number>
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isHovered) return
    const unsub = isHovered.on('change', (v) => setVisible(v === 1))
    return () => unsub()
  }, [isHovered])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute -top-8 left-1/2 w-max rounded-md px-2 py-1 text-[10px] font-medium tracking-[0.08em] uppercase pointer-events-none',
            className,
          )}
          style={{
            x: '-50%',
            background: 'var(--float)',
            border: '1px solid var(--line)',
            color: 'var(--t2)',
          }}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>
  const width = restProps['width'] as MotionValue<number>
  const widthTransform = useTransform(width, (v) => v / 2)

  return (
    <motion.div
      style={{ width: widthTransform, height: widthTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  )
}

export { Dock, DockIcon, DockItem, DockLabel }
