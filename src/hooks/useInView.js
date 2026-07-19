import { useEffect, useRef, useState } from 'react'

export function useInView(options = { threshold: 0.2, once: true }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (options.once) observer.unobserve(node)
      } else if (!options.once) {
        setInView(false)
      }
    }, options)
    observer.observe(node)
    return () => observer.disconnect()
  }, [options.once, options.threshold])

  return [ref, inView]
}
