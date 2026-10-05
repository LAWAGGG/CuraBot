import { useEffect, useRef, useState } from 'react'

export default function BannerWord({ word }) {
  const wrapRef = useRef(null)
  const textRef = useRef(null)
  const [clipped, setClipped] = useState(false)

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current || !textRef.current) return
      setClipped(textRef.current.scrollWidth > wrapRef.current.clientWidth + 1)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [word])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <span
        ref={textRef}
        aria-hidden="true"
        className={
          clipped
            ? 'absolute -bottom-13 left-2 max-w-full -translate-y-1/2 truncate text-7xl font-black tracking-tight whitespace-nowrap text-primary/25 uppercase select-none'
            : 'absolute -bottom-13 left-2 max-w-none -translate-y-1/2 text-7xl font-black tracking-tight whitespace-nowrap text-primary/25 uppercase select-none'
        }
      >
        {word}
      </span>
    </div>
  )
}
