/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { POST } from "@/app/api/legal-document/route";


describe("POST /api/legal-document (Route Handler)", () => {
  it("returns an SSE stream when given a promptText", async () => {
    // Create a mock request body
    const mockBody = { promptText: "Testing SSE route" };

    // Build a NextRequest with the JSON body
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const requestUrl = `${baseUrl}/api/legal-document`;

    const request = new NextRequest(requestUrl, {
      method: "POST",
      body: JSON.stringify(mockBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    // Read the streamed content
    if (reader) {
      const decoder = new TextDecoder();
      let done = false;
      let streamedData = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          streamedData += decoder.decode(value);
        }
      }

      // Verify it contains SSE data: 
      expect(streamedData).toContain("data:");
    }
  }, 40_000); // TODO: set proper benchmark timeout
});
