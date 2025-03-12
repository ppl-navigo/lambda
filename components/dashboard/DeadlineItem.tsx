import { AlertCircle, AlertTriangle, InfoIcon } from "lucide-react"
import { Button } from "../ui/button"

type Priority = "high" | "medium" | "low"
interface DeadlineItemProps {
    title: string
    dueDate: string
    priority: Priority
}

export function DeadlineItem({ title, dueDate, priority }: DeadlineItemProps) {

    const getPriorityIcon = (priority: Priority) => {
      switch (priority) {
        case "high":
          return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        case "medium":
          return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        case "low":
          return <InfoIcon className="h-3.5 w-3.5 text-blue-400" />
        default:
          return <InfoIcon className="h-3.5 w-3.5 text-blue-400" />
      }
    }
  
    return (
      <div className="flex items-center py-2 px-3 rounded bg-zinc-800">
        <div className="mr-3">{getPriorityIcon(priority)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-white truncate">{title}</h3>
          <p className="text-[11px] text-zinc-500">{dueDate}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-zinc-400 hover:text-white">
          View
        </Button>
      </div>
    )
  }