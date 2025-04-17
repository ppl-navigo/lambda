// textStreamer.test.ts
import { TextStreamer } from '../../app/utils/textStreamer';

describe('TextStreamer', () => {
  jest.useFakeTimers();

  test('simulates streaming by calling onUpdate with chunks', () => {
    const fullText = "This is a sample text for streaming in chunks.";
    const chunkSize = 10;
    const delayMs = 1000;
    const onUpdate = jest.fn();

    TextStreamer.simulateStream(fullText, chunkSize, delayMs, onUpdate);

    // Advance time by one delay (one chunk should have been processed)
    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledWith("This is a "); // First 10 characters

    // Advance time by the delay for each subsequent chunk
    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledWith("sample tex");

    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledWith("t for stre");

    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledWith("aming in c");

    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledWith("hunks.");

    // After all chunks processed, there should be no more calls
    jest.advanceTimersByTime(delayMs);
    expect(onUpdate).toHaveBeenCalledTimes(5);
  });

  afterAll(() => {
    jest.useRealTimers();
  });
});