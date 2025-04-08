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


export const maxDuration = 60;
export type Message = {
    role: "user" | "assistant"
    content: string
}

interface LegalChatbotProps {
    initialMessages?: Message[]
    onMessagesChange?: (messages: Message[]) => void
}

export function LegalChatbot({
    onMessagesChange,
}: LegalChatbotProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { messages, input, handleInputChange, handleSubmit, status } = useChat({
        api: "/api/chat",
        initialMessages: [{
            id: "1",
            role: "assistant",
            content: "Halo! Saya adalah **asisten hukum** Anda. Silakan ajukan pertanyaan hukum Anda dan saya akan membantu Anda!",
        }]
    });

    useEffect(() => {
        scrollToBottom()
    }, [messages])


    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
                <MathpixLoader>
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex flex-col max-w-[80%] rounded-lg p-4",
                                    message.role === "user" ? "ml-auto bg-primary text-black" : "mr-auto bg-muted",
                                )}
                            >
                                {message.role === "assistant" ? (
                                    <p className="prose dark:prose-invert">
                                        <MathpixMarkdown text={formatMessageWithCitations(message.content)} />
                                    </p>
                                ) : (
                                    <p className="prose dark:prose-invert">{message.content}</p>
                                )}
                            </div>
                        ))}
                        {status === "submitted" && (
                            <div className="mr-auto bg-muted max-w-[80%] rounded-lg p-4">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </MathpixLoader>
            </ScrollArea>
            <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto text-white">
                    <Input
                        placeholder="Ask a legal question..."
                        value={input}
                        onChange={handleInputChange}
                        disabled={status !== "ready"}
                        className="flex-1"
                    />
                    <Button aria-label="Send" type="submit" size="icon" disabled={status !== "ready"}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}

function formatMessageWithCitations(message: string): string {
    return message.replace(/\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]/g, '**[$1]**');
}
