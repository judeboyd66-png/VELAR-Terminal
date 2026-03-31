'use client'

import React, { useRef } from 'react'
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion'

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: React.ReactNode
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const rotate    = useTransform(scrollYProgress, [0, 1], [18, 0])
  const scale     = useTransform(scrollYProgress, [0, 1], isMobile ? [0.72, 0.92] : [1.04, 1])
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80])

  return (
    <div
      className="min-h-[58rem] md:h-[72rem] flex items-center justify-center relative px-4 md:px-16"
      ref={containerRef}
    >
      <div className="py-8 md:py-32 w-full relative" style={{ perspective: '1200px' }}>
        {/* Title */}
        <motion.div
          style={{ translateY: translate }}
          className="max-w-4xl mx-auto text-center mb-12 md:mb-16"
        >
          {titleComponent}
        </motion.div>

        {/* Card */}
        <motion.div
          style={{
            rotateX: isMobile ? 0 : rotate,
            scale,
            boxShadow: '0 0 0 1px var(--line), 0 40px 80px rgba(0,0,0,0.55), 0 16px 32px rgba(0,0,0,0.35)',
          }}
          className="max-w-5xl -mt-2 md:-mt-8 mx-auto min-h-[42rem] md:h-[38rem] w-full rounded-2xl overflow-hidden"
        >
          {/* Inner chrome */}
          <div
            className="h-full w-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}
          >
            {/* Window chrome bar */}
            <div
              className="flex items-center gap-1.5 px-4 h-9 shrink-0 border-b"
              style={{ background: 'var(--float)', borderColor: 'var(--line)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="ml-3 text-[10px] font-medium tracking-[0.2em] uppercase" style={{ color: 'var(--t4)' }}>
                VELAR — Overview
              </div>
            </div>
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
