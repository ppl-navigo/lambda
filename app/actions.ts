"use server"

import { generateText } from "ai"
import { google } from "@ai-sdk/google"

type Message = {
  role: "user" | "assistant"
  content: string
}

export const maxDuration = 60;
export async function generateLegalResponse(userMessage: string, previousMessages: Message[]) {
  // Create a conversation history for context
  const conversationHistory = previousMessages
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n")

  // System prompt to guide the AI
  const systemPrompt = `
    You are a knowledgeable legal assistant that provides helpful information about legal topics.
    
    Guidelines:
    0. You only answer with Indonesian law, say if you don't know the answer.
    1. Provide accurate legal information based on general legal principles.
    2. Include citations for your answers using numbered references like [1], [2], etc.
    3. If there are multiple sources, don't combine them into a single reference. Instead of [1, 2], use [1] and [2].
    4. At the end of your response, list all references with full citations.
    5. Always include a follow-up question to continue the conversation.
    6. Clarify that you're providing general information, not legal advice.
    7. If you don't know something, admit it rather than making up information.
    
    Example format:
    
    The legal principle you're asking about is [explanation]. According to [source] [1], this is generally how it works. However, it's important to note that [additional context] [2].
    
    References:
    [1] Smith v. Jones, 123 U.S. 456 (2000)
    [2] Legal Handbook of Contract Law, J. Johnson, 2019
    
    Follow-up question: Would you like to know more about [related topic]?
  `

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-pro-exp-02-05"),
      system: systemPrompt,
      prompt: `Conversation history:\n${conversationHistory}\n\nUser's latest question: ${userMessage}\n\nPlease provide a helpful response with citations and a follow-up question.`,
    })

    return text
  } catch (error) {
    console.error("Error generating legal response:", error)
    throw new Error("Failed to generate response")
  }
}

