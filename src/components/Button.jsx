import { classNames } from '../utils/helpers'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
}

export default function Button({ children, variant = 'primary', className = '', icon: Icon, ...props }) {
  return (
    <button className={classNames(variants[variant], className)} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  )
}
