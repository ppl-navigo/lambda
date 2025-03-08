import "@testing-library/jest-dom"

import React from 'react'
import { render, screen } from '@testing-library/react'
import Home from '../../app/chat/page'

jest.mock('@/components/chat-page', () => ({
    ChatPage: () => <div data-testid="chat-page">Chat Page Component</div>,
}))

describe('Home page', () => {
    it('renders ChatPage component', () => {
        render(<Home />)
        expect(screen.getByTestId('chat-page')).toBeInTheDocument()
    })
})