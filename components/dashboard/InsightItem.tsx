interface InsightItemProps {
    title: string
    value: string
    icon: React.ReactNode
}

export function InsightItem({ title, value, icon }: InsightItemProps) {
  return (
    <div className="flex items-center py-2 px-3 rounded bg-zinc-900">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 mr-3">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[11px] text-zinc-500">{title}</h3>
        <p className="text-xs font-medium text-white">{value}</p>
      </div>
    </div>
  )
}