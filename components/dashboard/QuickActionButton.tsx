import { ChevronRight } from "lucide-react"
import { Button } from "../ui/button"

interface QuickActionButtonProps {
    title: string
    description: string
    icon: React.ReactNode
}

export function QuickActionButton({ title, description, icon }: QuickActionButtonProps) {
    return (
      <Button
        variant="outline"
        className="w-full h-auto py-3 px-4 border-zinc-800 bg-zinc-900 text-left flex items-center justify-between hover:bg-zinc-800 hover:text-white"
      >
        <div className="flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 mr-3">{icon}</div>
          <div>
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <p className="text-xs text-zinc-500 text-wrap">{description}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-500" />
      </Button>
    )
  }