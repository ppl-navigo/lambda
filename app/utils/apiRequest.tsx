// app/utils/apiRequest.ts

export const apiRequest = async (
    systemPrompt: string, 
    bodyContent: string,
    customErrorMessage: string // Added custom error message
  ) => {
    try {
      const response = await fetch("/api/mou-analyzer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: bodyContent,
          systemPrompt,
        }),
      });
  
      if (!response.body) throw new Error("No stream body received");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedResponse = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedResponse += decoder.decode(value, { stream: true });
      }
      console.log("📥 API Response:", accumulatedResponse);
      return accumulatedResponse;
    } catch (error) {
      console.error(`❌ ${customErrorMessage}`, error);
      return `${customErrorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  };
  