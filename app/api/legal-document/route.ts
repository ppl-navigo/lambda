import { NextRequest } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    // Get request data
    const requestData = await req.json()

    // Connect to our backend API
    const response = await fetch(
      "http://127.0.0.1:8000/legal-docs-generator/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    )

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`)
    }

    // Create a TransformStream to handle text streaming from backend to frontend
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    let { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    // Process the backend stream
    if (response.body) {
      const reader = response.body.getReader()

      // Start reading the stream in the background
      ;(async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              await writer.close()
              break
            }

            // Forward the decoded chunk to our client
            const text = decoder.decode(value, { stream: true })
            await writer.write(encoder.encode(text))
          }
        } catch (e) {
          console.error("Stream processing error:", e)
          await writer.abort(e as Error)
        }
      })()
    }

    // Return the readable stream to the client
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("API route error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
