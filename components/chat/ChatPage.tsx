"use client"

import { useState, useEffect, useRef } from "react"
import { LegalChatbot } from "@/components/chat/LegalChatbot"
import { ChatHistory } from "@/components/chat/ChatHistory"
import { Button } from "@/components/ui/button"
import { PanelLeft, Plus } from "lucide-react"

type Message = {
  role: "user" | "assistant"
  content: string
}

type ChatSession = {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const isInitialLoad = useRef(true)
  const updatingSession = useRef(false)

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem("chatSessions")
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions)
        // Convert string dates back to Date objects
        sessions.forEach((session: ChatSession) => {
          session.createdAt = new Date(session.createdAt)
          session.updatedAt = new Date(session.updatedAt)
        })
        setChatSessions(sessions)

        // Set current session to the most recent one if it exists
        if (sessions.length > 0) {
          const mostRecentSession = sessions.sort(
            (a: ChatSession, b: ChatSession) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0]
          setCurrentSessionId(mostRecentSession.id)
        }
      } catch (error) {
        console.error("Error parsing saved sessions:", error)
        // If there's an error, start fresh
        setChatSessions([])
      }
    }
    isInitialLoad.current = false
  }, [])

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    // Skip the initial render to prevent unnecessary saves
    if (isInitialLoad.current) return

    if (chatSessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions))
    }
  }, [chatSessions])

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Legal Consultation",
      messages: [
        {
          role: "assistant",
          content:
            "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setChatSessions([newSession, ...chatSessions])
    setCurrentSessionId(newSession.id)
  }

  const updateChatSession = (sessionId: string, messages: Message[]) => {
    // Prevent duplicate updates
    if (updatingSession.current) return
    updatingSession.current = true

    setChatSessions((prevSessions) => {
      const updated = prevSessions.map((session) => {
        if (session.id === sessionId) {
          // Update the title based on the first user message if it exists
          const firstUserMessage = messages.find((m) => m.role === "user")
          const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "")
            : session.title

          return {
            ...session,
            messages,
            title,
            updatedAt: new Date(),
          }
        }
        return session
      })

      // Reset the flag after state update
      setTimeout(() => {
        updatingSession.current = false
      }, 0)

      return updated
    })
  }

  const deleteSession = (sessionId: string) => {
    setChatSessions(chatSessions.filter((session) => session.id !== sessionId))
    if (currentSessionId === sessionId) {
      const remainingSessions = chatSessions.filter((session) => session.id !== sessionId)
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id)
      } else {
        createNewChat()
      }
    }
  }

  const currentSession = chatSessions.find((session) => session.id === currentSessionId)

  // If no sessions exist, create a new one
  useEffect(() => {
    if (!isInitialLoad.current && chatSessions.length === 0) {
      createNewChat()
    }
  }, [chatSessions.length, createNewChat])

  return (
    <div className="flex h-screen bg-background dark">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0"
          } bg-muted transition-all duration-300 overflow-hidden flex flex-col h-full border-r`}
      >
        <div className="p-4 border-b">
          <Button onClick={createNewChat} className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4 text-white" />
            <span className="text-white">New Chat</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <ChatHistory
            sessions={chatSessions}
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onDeleteSession={deleteSession}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="border-b p-4 flex items-center justify-between bg-background">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-2">
              <PanelLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{currentSession?.title || "Legal Assistant"}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {currentSession && (
            <LegalChatbot
              initialMessages={currentSession.messages}
              onMessagesChange={(messages) => {
                if (currentSessionId) {
                  updateChatSession(currentSessionId, messages)
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

