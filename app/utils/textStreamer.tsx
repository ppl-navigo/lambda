export class TextStreamer {
    static simulateStream(
      fullText: string,
      chunkSize: number,
      delayMs: number,
      onUpdate: (chunk: string) => void
    ): void {
      let currentIndex = 0;
  
      const processChunk = () => {
        if (currentIndex < fullText.length) {
          const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);
          onUpdate(chunk); // Notify the caller with the new chunk
          currentIndex += chunkSize;
  
          setTimeout(processChunk, delayMs); // Recursive call with delay
        }
      };
  
      processChunk();
    }
  }