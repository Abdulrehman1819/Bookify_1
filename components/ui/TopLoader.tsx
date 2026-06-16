'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function TopLoader() {
  const [active, setActive] = useState(false)
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const navigating = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      if (navigating.current) {
        navigating.current = false
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setActive(false), 350)
      }
    }
    return () => clearTimeout(timer.current)
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:)/.test(href)) return
      if (a.getAttribute('target') === '_blank') return
      clearTimeout(timer.current)
      navigating.current = true
      setActive(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!active) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] h-[2px] overflow-hidden pointer-events-none bg-[#6366F1]/15">
      <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent animate-nav-loading" />
    </div>
  )
}
