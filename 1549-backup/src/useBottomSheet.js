import { useEffect, useState } from 'react'

export function useBottomSheet(isOpen, { duration = 300 } = {}) {
  const [render, setRender] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setActive(false)

      let openFrame
      const startFrame = requestAnimationFrame(() => {
        openFrame = requestAnimationFrame(() => setActive(true))
      })

      return () => {
        cancelAnimationFrame(startFrame)
        if (openFrame) cancelAnimationFrame(openFrame)
      }
    }

    setActive(false)
    const timer = setTimeout(() => setRender(false), duration)
    return () => clearTimeout(timer)
  }, [isOpen, duration])

  return { render, active }
}
