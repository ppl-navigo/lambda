"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useChat } from '@ai-sdk/react';
import { cn } from "@/lib/utils"
import { MathpixMarkdown, MathpixLoader } from 'mathpix-markdown-it';
import { supabase } from "@/lib/supabase"

export type Message = {
    role: "user" | "assistant"
    content: string
}

interface LegalChatbotProps {
    initialMessages?: Message[]
    onMessagesChange?: (messages: Message[]) => void
}

export function LegalSearch() {
    const [searchQuery, setSearchQuery] = useState("")
    const [input, setInput] = useState("")
    const [docs, setDocs] = useState([])

    useEffect(() => {
        // ilike %searchQuery% on body
        if (searchQuery.trim() === "") {
            setDocs([])
            return
        }
        supabase.from("legal_document").select("*")
            .ilike("body", `%${searchQuery}%`)
            .then(({ data, error }) => {
                if (error) {
                    console.log("Error fetching documents:", error)
                } else {
                    setDocs(data as any)
                }
            })
    }, [searchQuery])

    return (
        <div className="flex flex-col h-full">
            <div className="border-t p-4">
                <form onSubmit={(e) => {
                    // Handle search query submission
                    e.preventDefault()
                    if (input.trim() === "") {
                        return
                    }
                    setSearchQuery(input)
                }} className="flex gap-2 max-w-3xl mx-auto text-white">
                    <Input
                        placeholder="Insert your keyword here"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1"
                    />
                    <Button aria-label="Send" type="submit" size="icon">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
            <ScrollArea className="flex-1 p-4">
                <MathpixLoader>
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {docs.length === 0 ? (
                            <div className="text-center text-muted-foreground">No documents found</div>
                        ) : (
                            docs.map((doc: any, index: number) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex flex-col max-w-[80%] rounded-lg p-4",
                                        "mr-auto bg-muted",
                                    )}
                                >
                                    <div className="font-medium">{doc.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {formatMessageWithCitations(doc.body)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </MathpixLoader>
            </ScrollArea>
        </div>
    )
}

function formatMessageWithCitations(message: string): string {
    return message.replace(/(\[\d+\])/g, '**$1**');
}
