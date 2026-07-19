export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-leaf-300 dark:border-leaf-800 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-leaf-100 dark:bg-leaf-900 p-4 text-leaf-500 dark:text-mint-400">
          <Icon size={28} />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-leaf-700/70 dark:text-leaf-200/60">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
