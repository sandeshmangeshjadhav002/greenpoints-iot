import { classNames } from '../utils/helpers'

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={classNames(
        'glass rounded-2xl p-5',
        hover && 'transition-all duration-300 hover:shadow-glow hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
