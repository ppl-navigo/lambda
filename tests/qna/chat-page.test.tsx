import "@testing-library/jest-dom"

import React from "react"
import { render, fireEvent, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ChatPage } from "../../components/chat-page"

// Helper to clear localStorage before each test
beforeEach(() => {
    localStorage.clear()
})

jest.mock("../../app/actions", () => ({
    generateLegalResponse: jest.fn().mockResolvedValue(
        "Mocked legal response with citations [1] and [2]. Follow-up question: Would you like to know more about your legal options?"
    ),
}))

describe("ChatPage component", () => {
    test("renders and creates a new chat if localStorage is empty", async () => {
        window.HTMLElement.prototype.scrollIntoView = function() {};
        render(<ChatPage />)

        // Since no sessions exist, a new session should be created with default title "New Legal Consultation"
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /New Legal Consultation/i })).toBeInTheDocument()
        })
    })

    test("clicking 'New Chat' button creates a new chat", async () => {
        render(<ChatPage />)

        // Wait for initial auto-created session
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /New Legal Consultation/i })).toBeInTheDocument()
        })

        const newChatButton = screen.getByRole("button", { name: /New Chat/i })
        fireEvent.click(newChatButton)

        // After clicking the button, the new session should appear at the top of the history list
        await waitFor(() => {
            const allSessionTitles = screen.getAllByText("New Legal Consultation")
            expect(allSessionTitles.length).toBeGreaterThan(1)
        })
    })

    test("saves sessions to localStorage", async () => {
        render(<ChatPage />)

        // Wait for the auto-created session to be saved in localStorage
        await waitFor(() => {
            const stored = localStorage.getItem("chatSessions")
            expect(stored).not.toBeNull()
            if (stored) {
                const sessions = JSON.parse(stored)
                expect(sessions.length).toBeGreaterThan(0)
            }
        })
    })
})