import { useInView } from '../hooks/useInView'
import { useCountUp } from '../hooks/useCountUp'

export default function AnimatedCounter({ value, decimals = 0, suffix = '', prefix = '', className = '' }) {
  const [ref, inView] = useInView()
  const animated = useCountUp(value, { start: inView })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {animated.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}
