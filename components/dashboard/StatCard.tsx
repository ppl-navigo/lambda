import { CheckCircle } from "lucide-react"

interface StatCardProps {
    title: string
    value: string
    change: string
}

export function StatCard({ title, value, change }: StatCardProps) {
    const isPositive = change.includes("+")
  
    return (
      <div className="flex flex-col p-3 rounded bg-zinc-800">
        <div className="text-xs text-zinc-500 mb-1">{title}</div>
        <div className="flex items-end justify-between">
          <div className="text-lg font-medium text-white">{value}</div>
          <div className={`text-[11px] flex items-center ${isPositive ? "text-green-400" : "text-zinc-400"}`}>
            {isPositive && <CheckCircle className="h-3 w-3 mr-1" />}
            {change}
          </div>
        </div>
      </div>
    )
  }