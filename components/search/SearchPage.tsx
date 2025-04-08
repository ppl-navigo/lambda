"use client"

import { useState, useEffect, useRef } from "react"
import { LegalChatbot } from "@/components/chat/LegalChatbot"
import { ChatHistory } from "@/components/chat/ChatHistory"
import { Button } from "@/components/ui/button"
import { PanelLeft, Plus } from "lucide-react"
import { LegalSearch } from "./LegalSearch"

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

export function SearchPage() {

    return (
        <div className="flex h-screen bg-background dark">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="border-b p-4 flex items-center justify-between bg-background">
                    <div className="flex items-center">
                        <h1 className="text-xl font-semibold">Search Legal Document</h1>
                    </div>
                </header>
                <main className="flex-1 overflow-hidden">
                    <LegalSearch />
                </main>
            </div>
        </div>
    )
}

