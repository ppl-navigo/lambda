"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { generateLegalResponse } from "@/app/actions"
import { cn } from "@/lib/utils"
import { MathpixMarkdown, MathpixLoader } from 'mathpix-markdown-it';

export type Message = {
    role: "user" | "assistant"
    content: string
}

interface LegalChatbotProps {
    initialMessages?: Message[]
    onMessagesChange?: (messages: Message[]) => void
}

export function LegalChatbot({
    initialMessages = [
        {
            role: "assistant",
            content:
                "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
        },
    ],
    onMessagesChange,
}: LegalChatbotProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const prevMessagesLengthRef = useRef<number>(initialMessages.length)

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Initialize with initialMessages when they change
    useEffect(() => {
        // Only update if the initialMessages are different from current messages
        // and if it's not just a result of our own updates
        if (initialMessages.length !== messages.length && initialMessages.length !== prevMessagesLengthRef.current) {
            setMessages(initialMessages)
        }
    }, [initialMessages])

    useEffect(() => {
        if (messages.length !== initialMessages.length && onMessagesChange) {
            prevMessagesLengthRef.current = messages.length
            onMessagesChange(messages)
        }
    }, [messages, onMessagesChange, initialMessages.length])

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: input.trim() }
        setInput("")
        setIsLoading(true)

        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)

        try {
            const response = await generateLegalResponse(userMessage.content, messages)
            setMessages([...updatedMessages, { role: "assistant", content: response }])
        } catch (error) {
            console.error("Error generating response:", error)
            setMessages([
                ...updatedMessages,
                {
                    role: "assistant",
                    content: "I apologize, but I encountered an error processing your request. Please try again.",
                },
            ])
        } finally {
            setIsLoading(false)
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
                                    message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted",
                                )}
                            >
                                {message.role === "assistant" ? (
                                    <p className="prose dark:prose-invert">
                                        <MathpixMarkdown text={formatMessageWithCitations(message.content)}/>
                                    </p>
                                ) : (
                                    <p className="prose">{message.content}</p>
                                )}
                            </div>
                        ))}
                        {isLoading && (
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
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button aria-label="Send" type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}

function formatMessageWithCitations(message: string): string {
    return message.replace(/(\[\d+\])/g, '**$1**');
}
