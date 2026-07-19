export default function Table({ columns, data, renderRow }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-leaf-200 dark:border-leaf-800">
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-5 py-3.5 font-display text-xs font-semibold uppercase tracking-wide text-leaf-700/70 dark:text-leaf-200/60">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                className="border-b border-leaf-100 dark:border-leaf-900 last:border-0 transition-colors hover:bg-leaf-50/60 dark:hover:bg-leaf-900/40"
              >
                {renderRow(row, i)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
