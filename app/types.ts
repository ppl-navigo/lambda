// src/types.ts
export interface Risk {
    clause: string;
    risky_text: string;
    reason: string;
    revision?: string; // Optional field for the revised text
  }
  
  export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
  }