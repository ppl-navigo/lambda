/**
 * @jest-environment node
 */

import { simulateReadableStream, streamText } from "ai";
import * as chatbotHandler from "../../app/api/qna/route";
import { testApiHandler } from 'next-test-api-route-handler';

beforeEach(() => {
    console.error = jest.fn();
});

    jest.mock("ai", () => ({
        streamText: jest.fn().mockImplementation(() => simulateReadableStream({
            chunks: [
                { type: 'text-delta', textDelta: 'Hello' },
                { type: 'text-delta', textDelta: ', ' },
                { type: 'text-delta', textDelta: `world!` },
                {
                    type: 'finish',
                    finishReason: 'stop',
                    logprobs: undefined,
                    usage: { completionTokens: 10, promptTokens: 3 },
                },
            ],
        }))
    }))

const mockMessage = [{
    role: "user",
    content: "why is the sky blue?"
}]

const mockRequest = {
    method: 'POST',
    body: JSON.stringify({
        messages: mockMessage
    })
}

describe("QnA Chatbot API", () => {
    it("should respond to the question", async () => {
        await testApiHandler({
            appHandler: chatbotHandler,
            async test({ fetch }) {
                await fetch(mockRequest);
                expect(streamText).toHaveBeenCalled();
                // ensure the arguments passed to streamText are correct
                expect(streamText).toHaveBeenCalledWith({
                    model: expect.any(Object),
                    messages: mockMessage,
                });
            }
        })
    })
});