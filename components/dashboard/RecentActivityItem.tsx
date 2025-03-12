interface RecentActivityItemProps {
    title: string
    type: string
    time: string
    icon: React.ReactNode
}

export function RecentActivityItem({ title, type, time, icon }: RecentActivityItemProps) {
    return (
      <div className="flex items-center py-2 px-3 rounded hover:bg-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 mr-3">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-white truncate">{title}</h3>
          <p className="text-[11px] text-zinc-500">{type}</p>
        </div>
        <div className="text-[11px] text-zinc-500 ml-2">{time}</div>
      </div>
    )
  }
  