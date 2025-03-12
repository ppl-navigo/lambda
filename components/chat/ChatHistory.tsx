"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
    createdAt?: Date
}

type ChatSession = {
    id: string
    title: string
    messages: ChatMessage[]
    createdAt: Date
    updatedAt: Date
}

interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
}

export function ChatHistory({ sessions, currentSessionId, onSelectSession, onDeleteSession }: ChatHistoryProps) {
  // Sort sessions by updatedAt (most recent first)
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return (
    <div className="py-2">
      {sortedSessions.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted-foreground">No chat history yet</div>
      ) : (
        sortedSessions.map((session) => (
          <div
            key={session.id}
            className={`px-3 py-2 mx-2 my-1 rounded-md cursor-pointer flex justify-between items-center group ${
              currentSessionId === session.id ? "bg-primary/10" : "hover:bg-muted"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="flex items-center overflow-hidden">
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0 text-white" />
              <div className="truncate">
                <div className="font-medium truncate text-white">{session.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(session.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                // onDeleteSession(session.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  )
}

