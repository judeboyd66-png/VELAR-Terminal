'use client'

import { cn } from '@/lib/utils'
import { useTheme, THEMES } from '@/components/shell/ThemeProvider'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const { theme } = useTheme()
  const isDark = THEMES.find(t => t.id === theme)?.dark ?? true
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const SEPARATION = 160
    const AMOUNTX = 28
    const AMOUNTY = 42

    const container = containerRef.current
    const w = container.offsetWidth
    const h = container.offsetHeight

    const scene = new THREE.Scene()
    const fogColor = isDark ? 0x0c0c0f : 0xede5d4
    scene.fog = new THREE.Fog(fogColor, 1800, 9000)

    const camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000)
    camera.position.set(0, 320, 1100)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.setClearColor(fogColor, 0)
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.userSelect = 'none'
    container.appendChild(renderer.domElement)

    const positions: number[] = []
    const colors: number[] = []

    const geometry = new THREE.BufferGeometry()

    // Dot color: warm cream on dark, soft charcoal on light
    const [r, g, b] = isDark ? [0.86, 0.77, 0.62] : [0.16, 0.13, 0.10]

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        )
        colors.push(r, g, b)
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 5.5,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.45 : 0.35,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let count = 0
    let animId = 0

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const pos = geometry.attributes.position.array as Float32Array
      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i * 3 + 1] =
            Math.sin((ix + count) * 0.28) * 52 +
            Math.sin((iy + count) * 0.46) * 52
          i++
        }
      }
      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
      count += 0.075
    }

    animate()

    const handleResize = () => {
      const nw = container.offsetWidth
      const nh = container.offsetHeight
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      {...props}
    />
  )
}
