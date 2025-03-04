import "@testing-library/jest-dom"

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LegalChatbot, Message } from "@/components/legal-chatbot"
import { generateLegalResponse } from "@/app/actions"

jest.mock("@/app/actions", () => ({
    generateLegalResponse: jest.fn(),
}))

describe("LegalChatbot", () => {
    const initialMessage: Message = {
        role: "assistant",
        content:
            "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
    }

    jest.mock("@/app/actions", () => ({
        generateLegalResponse: jest.fn(),
    }))

    describe("LegalChatbot", () => {
        const initialMessage: Message = {
            role: "assistant",
            content:
                "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
        }

        beforeEach(() => {
            jest.clearAllMocks()
        })
        window.HTMLElement.prototype.scrollIntoView = function() {};
        it("renders initial assistant message", () => {
            render(<LegalChatbot initialMessages={[initialMessage]} />)
            expect(screen.getByText(initialMessage.content)).toBeInTheDocument()
        })

        it("handles user submission and displays assistant response", async () => {
            const userPrompt = "What is the statute of limitations?"
            const assistantResponse = "The statute of limitations may vary by state. [1]"

            window.HTMLElement.prototype.scrollIntoView = function() {};
            ;(generateLegalResponse as jest.Mock).mockResolvedValue(assistantResponse)
            render(<LegalChatbot initialMessages={[initialMessage]} />)

            const input = screen.getByPlaceholderText("Ask a legal question...")

            // Type and submit user input
            fireEvent.change(input, { target: { value: userPrompt } })
            fireEvent.submit(input.closest("form")!)

            // Check if user message appears in the chat
            expect(await screen.findByText(userPrompt)).toBeInTheDocument()

            // Wait for assistant response to appear
            await waitFor(() => {
                expect(screen.getByText("The statute of limitations may vary by state.")).toBeInTheDocument()
            })

            // Check that citation is rendered in a sup element
            expect(screen.getByText("[1]")).toBeInTheDocument()
            expect(generateLegalResponse).toHaveBeenCalledWith(userPrompt, [initialMessage])
        })

        it("does not submit empty messages or while loading", async () => {
            render(<LegalChatbot initialMessages={[initialMessage]} />)

            const input = screen.getByPlaceholderText("Ask a legal question...")
            const button = screen.getByRole("button", { name: /send/i })

            // Try submitting empty message
            fireEvent.change(input, { target: { value: "   " } })
            fireEvent.submit(input.closest("form")!)
            expect(generateLegalResponse).not.toHaveBeenCalled()

            // Submit valid message and immediately attempt another while loading
            const userPrompt = "Provide legal citation examples."
            ;(generateLegalResponse as jest.Mock).mockImplementation(
                () =>
                    new Promise((resolve) => setTimeout(() => resolve("Example citation [2]"), 100))
            )
            fireEvent.change(input, { target: { value: userPrompt } })
            fireEvent.submit(input.closest("form")!)

            // Immediately try resubmitting before loading finished
            fireEvent.change(input, { target: { value: "Another question" } })
            fireEvent.submit(input.closest("form")!)

            await waitFor(() => {
                expect(screen.getByText(userPrompt)).toBeInTheDocument()
            })
            // Only one call should be made since second submission should be ignored
            expect(generateLegalResponse).toHaveBeenCalledTimes(1)
        })

        it("calls onMessagesChange with updated messages", async () => {
            const onMessagesChange = jest.fn()
            const userPrompt = "What is trademark law?"
            const assistantResponse = "Trademark law protects brand identity. [3]"

            ;(generateLegalResponse as jest.Mock).mockResolvedValue(assistantResponse)

            render(
                <LegalChatbot initialMessages={[initialMessage]} onMessagesChange={onMessagesChange} />
            )

            const input = screen.getByPlaceholderText("Ask a legal question...")
            fireEvent.change(input, { target: { value: userPrompt } })
            fireEvent.submit(input.closest("form")!)

            await waitFor(() => {
                expect(screen.getByText("Trademark law protects brand identity.")).toBeInTheDocument()
            })

            // onMessagesChange should have been called after adding both user and assistant messages
            expect(onMessagesChange).toHaveBeenCalled()
            const calls = onMessagesChange.mock.calls
            // The last call should include 3 messages: initial, user, and assistant.
            expect(calls[calls.length - 1][0]).toHaveLength(3)
        })
    })

    describe("Additional LegalChatbot tests", () => {
        const initialMessage: Message = {
            role: "assistant",
            content:
                "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
        }

        beforeEach(() => {
            jest.clearAllMocks()
        })

        it("clears the input and immediately adds the user message", async () => {
            const userPrompt = "Immediate message test"
            // Simulate unresolved promise to verify immediate state before assistant responds.
            window.HTMLElement.prototype.scrollIntoView = function() {};
            ;(generateLegalResponse as jest.Mock).mockImplementation(() => new Promise(() => {}))
            render(<LegalChatbot initialMessages={[initialMessage]} />)

            const input = screen.getByPlaceholderText("Ask a legal question...")
            fireEvent.change(input, { target: { value: userPrompt } })
            fireEvent.submit(input.closest("form")!)

            // Input should be cleared right away.
            expect(input).toHaveValue("")
            // User message should be in the chat immediately.
            expect(await screen.findByText(userPrompt)).toBeInTheDocument()
        })

        it("renders messages with proper HTML structure", () => {
            const userMessage: Message = { role: "user", content: "User message content" }
            const assistantMessage: Message = {
                role: "assistant",
                content: "Assistant message with citation [4]",
            }
            render(<LegalChatbot initialMessages={[assistantMessage, userMessage]} />)

            // Assistant messages are rendered with formatted citations inside an element with class "prose"
            const assistantText = screen.getByText("Assistant message with citation")
            expect(assistantText.closest("div")).toHaveClass("prose")

            // User messages are rendered without the "prose" styling, check for <p> tag
            const userText = screen.getByText("User message content")
            expect(userText.tagName).toBe("P")
        })

        it("calls scrollIntoView when messages update", async () => {
            // Spy on scrollIntoView on all elements.
            window.HTMLElement.prototype.scrollIntoView = function() {};
            const scrollSpy = jest.spyOn(HTMLElement.prototype, "scrollIntoView")
            const userPrompt = "Scroll test message"
            ;(generateLegalResponse as jest.Mock).mockResolvedValue("Response for scroll test")
            render(<LegalChatbot initialMessages={[initialMessage]} />)
            const input = screen.getByPlaceholderText("Ask a legal question...")
            fireEvent.change(input, { target: { value: userPrompt } })
            fireEvent.submit(input.closest("form")!)
            await waitFor(() => {
                expect(screen.getByText("Response for scroll test")).toBeInTheDocument()
            })
            // The scrollIntoView should have been called as messages updated.
            expect(scrollSpy).toHaveBeenCalled()
            scrollSpy.mockRestore()
        })
    })

    it("renders initial assistant message", () => {
        render(<LegalChatbot initialMessages={[initialMessage]} />)
        expect(screen.getByText(initialMessage.content)).toBeInTheDocument()
    })

    it("handles user submission and displays assistant response", async () => {
        const userPrompt = "What is the statute of limitations?"
        const assistantResponse = "The statute of limitations may vary by state. [1]"

        ;(generateLegalResponse as jest.Mock).mockResolvedValue(assistantResponse)

        render(<LegalChatbot initialMessages={[initialMessage]} />)

        const input = screen.getByPlaceholderText("Ask a legal question...")

        // Type and submit user input
        fireEvent.change(input, { target: { value: userPrompt } })
        fireEvent.submit(input.closest("form")!)

        // Check if user message appears in the chat
        expect(await screen.findByText(userPrompt)).toBeInTheDocument()

        // Wait for assistant response to appear
        await waitFor(() => {
            expect(screen.getByText("The statute of limitations may vary by state.")).toBeInTheDocument()
        })

        // Check that citation is rendered in a sup element
        expect(screen.getByText("[1]")).toBeInTheDocument()
        expect(generateLegalResponse).toHaveBeenCalledWith(userPrompt, [
            initialMessage,
        ])
    })

    it("does not submit empty messages or while loading", async () => {
        render(<LegalChatbot initialMessages={[initialMessage]} />)

        const input = screen.getByPlaceholderText("Ask a legal question...")
        const button = screen.getByRole("button", { name: /send/i })

        // Try submitting empty message
        fireEvent.change(input, { target: { value: "   " } })
        fireEvent.submit(input.closest("form")!)
        expect(generateLegalResponse).not.toHaveBeenCalled()

        // Submit valid message and immediately attempt another while loading
        const userPrompt = "Provide legal citation examples."
        ;(generateLegalResponse as jest.Mock).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve("Example citation [2]"), 100))
        )
        fireEvent.change(input, { target: { value: userPrompt } })
        fireEvent.submit(input.closest("form")!)

        // Immediately try resubmitting before loading finished
        fireEvent.change(input, { target: { value: "Another question" } })
        fireEvent.submit(input.closest("form")!)

        await waitFor(() => {
            expect(screen.getByText(userPrompt)).toBeInTheDocument()
        })
        // Only one call should be made since second submission should be ignored
        expect(generateLegalResponse).toHaveBeenCalledTimes(1)
    })

    it("calls onMessagesChange with updated messages", async () => {
        const onMessagesChange = jest.fn()
        const userPrompt = "What is trademark law?"
        const assistantResponse = "Trademark law protects brand identity. [3]"

        ;(generateLegalResponse as jest.Mock).mockResolvedValue(assistantResponse)

        render(<LegalChatbot initialMessages={[initialMessage]} onMessagesChange={onMessagesChange} />)

        const input = screen.getByPlaceholderText("Ask a legal question...")
        fireEvent.change(input, { target: { value: userPrompt } })
        fireEvent.submit(input.closest("form")!)

        await waitFor(() => {
            expect(screen.getByText("Trademark law protects brand identity.")).toBeInTheDocument()
        })

        // onMessagesChange should have been called after adding both user and assistant messages
        expect(onMessagesChange).toHaveBeenCalled()
        const calls = onMessagesChange.mock.calls
        // The last call should include 3 messages: initial, user, and assistant.
        expect(calls[calls.length - 1][0]).toHaveLength(3)
    })
})
it("shows error message when generateLegalResponse fails", async () => {
    const userPrompt = "Test error input"
    const error = new Error("Test error")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const initialMessage: Message = {
        role: "assistant",
        content: "Hello, I'm your legal assistant. I can answer legal questions and provide citations. How can I help you today?",
    }

    ;(generateLegalResponse as jest.Mock).mockRejectedValue(error)

    render(<LegalChatbot initialMessages={[initialMessage]} />)
    const input = screen.getByPlaceholderText("Ask a legal question...")
    fireEvent.change(input, { target: { value: userPrompt } })
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
        expect(
            screen.getByText(
                "I apologize, but I encountered an error processing your request. Please try again."
            )
        ).toBeInTheDocument()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error generating response:", error)
    consoleErrorSpy.mockRestore()
})
jest.mock("@/app/actions", () => ({
    generateLegalResponse: jest.fn(),
}))