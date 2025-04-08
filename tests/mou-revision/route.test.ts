/**
 * @jest-environment node
 */
import { ReadableStream } from 'web-streams-polyfill';
// @ts-ignore
global.ReadableStream = ReadableStream;

import { POST } from "@/app/api/mou-revision/route";
import { NextRequest } from "next/server";
import axios from "axios";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

jest.mock("axios");
jest.mock("@ai-sdk/google");
jest.mock("ai");

// Mock NextResponse lengkap
jest.mock("next/server", () => ({
  NextResponse: class {
    body: any;
    status: number;
    headers: Headers;

    constructor(body: any, init?: { status?: number; headers?: HeadersInit }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }

    static json(body: any, init?: { status?: number; headers?: HeadersInit }) {
      return new this(JSON.stringify(body), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    }
  },
}));

const mockStreamResponse = {
  textStream: (async function* () {
    yield "Mock revised text";
  })(),
};

describe("POST /api/mou-revision", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (streamText as jest.Mock).mockReset();
    (axios.post as jest.Mock).mockReset();
    (axios.get as jest.Mock).mockReset();
  });

  const createMockRequest = (body: any) => ({
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as NextRequest);

  it("successful PDF processing", async () => {
    // Mock semua dependensi
    (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from("pdf") });
    (axios.post as jest.Mock).mockResolvedValue({
      data: { extracted_text: "text" }
    });
    (streamText as jest.Mock).mockResolvedValue(mockStreamResponse);

    const response = await POST(createMockRequest({ pdfUrl: "valid.pdf" }));

    // Test status dan headers
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    // Test stream content
    const reader = response.body?.getReader();
    let result = "";
    while(true) {
      const { done, value } = await reader!.read();
      if(done) break;
      result += new TextDecoder().decode(value);
    }
    expect(result).toBe("Mock revised text");
  });

  it("handles missing pdfUrl", async () => {
    const response = await POST(createMockRequest({}));
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body as any)).toEqual({ error: "Missing pdfUrl" });
  });

  it("handles PDF download failure", async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error("Download failed"));
    
    const response = await POST(createMockRequest({ pdfUrl: "invalid.pdf" }));
    expect(response.status).toBe(500);
  });

  it("handles text extraction failure", async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from("pdf") });
    (axios.post as jest.Mock).mockRejectedValue(new Error("Extraction failed"));
    
    const response = await POST(createMockRequest({ pdfUrl: "valid.pdf" }));
    expect(response.status).toBe(500);
  });

  it("handles AI processing failure", async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from("pdf") });
    (axios.post as jest.Mock).mockResolvedValue({ data: { extracted_text: "text" }});
    (streamText as jest.Mock).mockRejectedValue(new Error("AI error"));
    
    const response = await POST(createMockRequest({ pdfUrl: "valid.pdf" }));
    expect(response.status).toBe(500);
  });
});