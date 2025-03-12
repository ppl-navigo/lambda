import "@testing-library/jest-dom"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChatHistory } from "../../components/chat/ChatHistory"

"use client"

describe("ChatHistory Component", () => {
    const now = new Date()

    const session1 = {
        id: "1",
        title: "First Session",
        messages: [],
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 1),
    }

    const session2 = {
        id: "2",
        title: "Second Session",
        messages: [],
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 30),
    }

    it("renders no chat history message when sessions list is empty", () => {
        render(
            <ChatHistory
                sessions={[]}
                currentSessionId={null}
                onSelectSession={jest.fn()}
                onDeleteSession={jest.fn()}
            />
        )
        expect(screen.getByText("No chat history yet")).toBeInTheDocument()
    })

    it("renders sessions sorted by updatedAt (most recent first)", () => {
        render(
            <ChatHistory
                sessions={[session1, session2]}
                currentSessionId={null}
                onSelectSession={jest.fn()}
                onDeleteSession={jest.fn()}
            />
        )
        const displayedTitles = screen.getAllByText(/Session/)
        // The first item rendered should be session2's title because it has the most recent updatedAt value.
        expect(displayedTitles[0].textContent).toBe("Second Session")
        expect(displayedTitles[1].textContent).toBe("First Session")
    })

    it("calls onSelectSession when a session is clicked", () => {
        const onSelectSession = jest.fn()
        render(
            <ChatHistory
                sessions={[session1]}
                currentSessionId={null}
                onSelectSession={onSelectSession}
                onDeleteSession={jest.fn()}
            />
        )
        const sessionItem = screen.getByText("First Session")
        fireEvent.click(sessionItem)
        expect(onSelectSession).toHaveBeenCalledWith("1")
    })

    // it("calls onDeleteSession when delete button is clicked", () => {
    //     const onDeleteSession = jest.fn()
    //     render(
    //         <ChatHistory
    //             sessions={[session1]}
    //             currentSessionId={null}
    //             onSelectSession={jest.fn()}
    //             onDeleteSession={onDeleteSession}
    //         />
    //     )
    //     // Query the button by role: it is rendered as a button element.
    //     const deleteButton = screen.getByRole("button")
    //     fireEvent.click(deleteButton)
    //     expect(onDeleteSession).toHaveBeenCalledWith("1")
    // })

    it("applies the selected class when a session is the current session", () => {
        render(
            <ChatHistory
                sessions={[session1]}
                currentSessionId={"1"}
                onSelectSession={jest.fn()}
                onDeleteSession={jest.fn()}
            />
        )
        // Find the session element by text and then retrieve its parent clickable div.
        const sessionTitle = screen.getByText("First Session")
        const sessionItem = sessionTitle.closest("div.px-3.py-2.mx-2.my-1.rounded-md.cursor-pointer.flex.justify-between.items-center.group")
        expect(sessionItem).toBeInTheDocument()
        // The selected session should have the "bg-primary/10" class and should not have "hover:bg-muted"
        expect(sessionItem!.className).toContain("bg-primary/10")
        expect(sessionItem!.className).not.toContain("hover:bg-muted")
    })

    it("applies the hover class when a session is not the current session", () => {
        render(
            <ChatHistory
                sessions={[session1]}
                currentSessionId={null}
                onSelectSession={jest.fn()}
                onDeleteSession={jest.fn()}
            />
        )
        const sessionTitle = screen.getByText("First Session")
        const sessionItem = sessionTitle.closest("div.px-3.py-2.mx-2.my-1.rounded-md.cursor-pointer.flex.justify-between.items-center.group")
        expect(sessionItem).toBeInTheDocument()
        // When not selected, it should include "hover:bg-muted" and not have "bg-primary/10"
        expect(sessionItem!.className).toContain("hover:bg-muted")
        expect(sessionItem!.className).not.toContain("bg-primary/10")
    })
})