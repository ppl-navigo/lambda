/**
 * @jest-environment jest-fixed-jsdom
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import ChatPage from '../../app/chat/page'
import { useChat } from '@ai-sdk/react'
import '@testing-library/jest-dom'

var mockHandleSubmit = jest.fn(e => e.preventDefault())
var mockSetInput = jest.fn()


beforeEach(() => {
    jest.mock('@ai-sdk/react', () => ({
        useChat: jest.fn().mockReturnValue({
            messages: [],
            input: '',
            setInput: mockSetInput,
            handleSubmit: mockHandleSubmit
        }),
    }));
    render(<ChatPage />)
})

describe("ChatPage", () => {
    it("should render without crashing", () => {
        const div = document.querySelector('div')
        expect(div).toBeInTheDocument()
    })

    it("should render the chat form", () => {
        const form = document.getElementById('chat-form')
        const input = document.getElementById('chat-input')
        const submit = document.getElementById('chat-submit')
        expect(form).toBeInTheDocument()
        expect(input).toBeInTheDocument()
        expect(submit).toBeInTheDocument()
    })

    // test submit
    it("should call handleSubmit on submit", () => {
        const form = document.getElementById('chat-form')
        form.onsubmit = mockHandleSubmit
        fireEvent.submit(form)
        expect(mockHandleSubmit).toHaveBeenCalled()
    })
})