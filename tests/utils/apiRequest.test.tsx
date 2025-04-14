// __tests__/apiRequest.test.ts
import { apiRequest } from "@/app/utils/apiRequest";

// Mock the global fetch function
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("apiRequest", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("successfully fetches data", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const responseText = "test response";
        const customErrorMessage = "custom error message";

        const mockResponse = {
            body: {
                getReader: () => ({
                    async read() {
                        return { done: true, value: new TextEncoder().encode(responseText) };
                    }
                })
            },
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ bodyContent }),
            text: async () => responseText
        } as unknown as Response;

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);
        
        expect(result).toBe("");
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith("/api/mou-analyzer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                promptText: bodyContent,
                systemPrompt,
            }),
        });
    });

    test("successfully fetches data with multiple chunked responses", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const responseTextPart1 = "test response part 1";
        const responseTextPart2 = "test response part 2";
        const customErrorMessage = "custom error message";

        let readCount = 0;
        const mockResponse = {
            body: {
                getReader: () => ({
                    async read() {
                        readCount += 1;
                        if (readCount === 1) {
                            return { done: false, value: new TextEncoder().encode(responseTextPart1) };
                        } else if (readCount === 2) {
                            return { done: false, value: new TextEncoder().encode(responseTextPart2) };
                        } else {
                            return { done: true, value: undefined };
                        }
                    }
                })
            },
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ bodyContent }),
            text: async () => responseTextPart1 + responseTextPart2
        } as unknown as Response;

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);
        
        expect(result).toBe(responseTextPart1 + responseTextPart2);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith("/api/mou-analyzer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                promptText: bodyContent,
                systemPrompt,
            }),
        });
    });
    
    test("handles missing response body", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const customErrorMessage = "custom error message";

        const mockResponse = {
            body: null,
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ bodyContent }),
            text: async () => ""
        } as unknown as Response;

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);

        expect(result).toContain("No stream body received");
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("handles stream reading errors", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const customErrorMessage = "custom error message";

        const mockResponse = {
            body: {
                getReader: () => ({
                    async read() {
                        throw new Error("Stream reading error");
                    }
                })
            },
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ bodyContent }),
            text: async () => ""
        } as unknown as Response;

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);

        expect(result).toContain("Stream reading error");
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("handles fetch errors", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const customErrorMessage = "custom error message";

        mockFetch.mockRejectedValueOnce(new Error("Fetch error"));

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);

        expect(result).toContain("Fetch error");
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test("handles unknown errors", async () => {
        const systemPrompt = "test system prompt";
        const bodyContent = "test body content";
        const customErrorMessage = "custom error message";

        // Cause an unknown type of error
        mockFetch.mockRejectedValueOnce("Unknown error");

        const result = await apiRequest(systemPrompt, bodyContent, customErrorMessage);

        expect(result).toContain("Unknown error");
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});