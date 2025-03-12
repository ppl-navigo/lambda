import { AlertTriangle, CheckCircle, FileText, InfoIcon } from "lucide-react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

type Status = "Complete" | "In Review" | "Draft" | "Pending"
interface DocumentItemProps {
    title: string
    date: string
    status: Status
}

const getStatusBadge = (status: Status) => {
    switch (status) {
      case "Complete":
        return (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 border-green-800 text-green-400 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" /> {status}
          </Badge>
        )
      case "In Review":
        return (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 border-blue-800 text-blue-400 flex items-center gap-1"
          >
            <InfoIcon className="h-3 w-3" /> {status}
          </Badge>
        )
      case "Draft":
        return (
          <Badge
            variant="outline"
            className="text-[10px] h-5 px-1.5 border-amber-800 text-amber-400 flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3" /> {status}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-400">
            {status}
          </Badge>
        )
    }
  }

export function DocumentItem({ title, date, status }: DocumentItemProps) {
    return (
      <div className="flex items-center py-2 px-3 rounded bg-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 mr-3">
          <FileText className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-white truncate">{title}</h3>
            {getStatusBadge(status)}
          </div>
          <p className="text-[11px] text-zinc-500">{date}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-zinc-400 hover:text-white">
          View
        </Button>
      </div>
    )
  }
  