import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";

jest.mock('react-markdown', () => {
  return ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
});

jest.mock('remark-gfm', () => {
  return () => null; // Simply return null or an empty component, as we are not testing its behavior
});

jest.mock('remark-breaks', () => {
  return () => null; // Similarly, mock remark-breaks as an empty component
});


import MarkdownViewer from "@/app/components/MarkdownViewer";
import { act } from 'react'; // Change this line to use act from react

// ----------------------------------------------------------------
// 1) Polyfill ReadableStream so Node won't crash on streaming
// ----------------------------------------------------------------
global.ReadableStream = class {
  // Minimal no-op polyfill so we don't crash
  constructor() {}
} as any;

// ----------------------------------------------------------------
// 2) Mock axios - "default.get" must be a jest.fn()
// ----------------------------------------------------------------
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(), // ✅ Add this
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
mockedAxios.post = jest.fn().mockResolvedValue({
  data: { extracted_text: "Mock extracted text from backend" },
});


// ----------------------------------------------------------------
// 4) Mock fetch (AI streaming) - we'll do different scenarios
// ----------------------------------------------------------------
// Mock fetch (AI streaming) - success
function mockFetchSuccess() {
  global.fetch = jest.fn(async () => {
    let callCount = 0;
    return {
      body: {
        getReader() {
          return {
            async read() {
              callCount++;
              if (callCount === 1) {
                return {
                  done: false,
                  value: new TextEncoder().encode(
                    `**Klausul 1:** "Risky Text" **Alasan:** "Some reason."\n`
                  ),
                };
              } else {
                return { done: true, value: undefined };
              }
            },
          };
        },
      },
    } as any;
  });
}


function mockFetchFail() {
  global.fetch = jest.fn(async () => {
    // This simulates a streaming error
    throw new Error("AI streaming error");
  });
}

// ----------------------------------------------------------------
// 5) Create a dummy PDF blob. We'll re-use for "docx" too
// ----------------------------------------------------------------
const dummyBlob = new Blob(["dummy content"], { type: "application/octet-stream" });
(dummyBlob as any).arrayBuffer = async () => new ArrayBuffer(8);

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------
describe("MarkdownViewer (Simplified Tests)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("1) Renders 'No risks found.' if pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("2) PDF load success & AI streaming success => we see risk items", async () => {
    jest.setTimeout(15000);
  
    // Mock the axios and fetch functions
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockFetchSuccess();
  
    // Wrap the render in act to handle async updates
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });
    
    // Wait for the spinner to appear and then disappear
    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());

    // Check if the risk item is displayed
    await waitFor(() => expect(screen.getByText(/Risky Text/i)).toBeInTheDocument());
  
    // Simulate expanding the risk item
    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
  
    // Verify that the reason for the risk appears
    await waitFor(() => expect(screen.getByText(/⚠️ Reason:/i)).toBeInTheDocument());
  });
  

  test("3) DOCX load success => no AI streaming or do we still stream? We'll mock success again", async () => {
    jest.setTimeout(15000);

    // Return docx blob
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockFetchSuccess();

    // We'll pass a docx URL
    render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.docx" />);

    // Adding a delay before checking spinner visibility
    // Wait for the spinner to appear and then disappear
    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
  
    // The AI text
    await waitFor(() => {
      expect(
        screen.getByText(/The potential risky clauses are listed below/i)
      ).toBeInTheDocument();
    });
  });

  test("AI streaming success => we see risk items", async () => {
    jest.setTimeout(10000); // Increase timeout to avoid the default 5000ms timeout
  
    // Set up mock responses for both axios and fetch
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockFetchSuccess();
  
    // Start the rendering process within act
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });
  
    // Wait for spinner to appear and disappear
    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
  
    // Assert that the risky clause is found
    await waitFor(() => {
      expect(screen.getByText(/Risky Text/i)).toBeInTheDocument();
    });
  
    // Verify that the "Expand" button works
    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
    await waitFor(() => expect(screen.getByText(/⚠️ Reason:/i)).toBeInTheDocument());
  });
  
  test("AI streaming fails => shows error message", async () => {
    jest.setTimeout(10000); // Increase timeout to avoid default timeout
  
    // Set up mock for axios and a failing fetch
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockFetchFail(); // Force the AI streaming to fail
  
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });
  
    // Wait for the spinner to appear and disappear
    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
  
    // Assert the error message is displayed after streaming fails
    await waitFor(() => {
      expect(screen.getByText(/gagal menganalisis dokumen/i)).toBeInTheDocument();
    });
  })

  test("Catches error during AI streaming and displays error message", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockFetchFail();

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });

    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
    await waitFor(() => expect(screen.getByText(/Gagal menganalisis dokumen/i)).toBeInTheDocument());
  });

  test("Handles missing PDF URL gracefully", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("Handles empty AI response correctly", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });

    global.fetch = jest.fn(async () => {
      return {
        body: {
          getReader() {
            return {
              async read() {
                return { done: true, value: undefined };
              },
            };
          },
        },
      } as any;
    });

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });

    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
    await waitFor(() => expect(screen.getByText(/Gagal menganalisis dokumen/i)).toBeInTheDocument());
  });

  test("Handles backend extraction error correctly", async () => {
    // Mock the file download to succeed
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
  
    // Simulate backend text extraction failing
    mockedAxios.post.mockRejectedValueOnce(new Error("Extraction failed"));
  
    // Also mock fetch to avoid it interfering (since no text will be extracted anyway)
    mockFetchSuccess();
  
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });
  
    // Wait for the error to show up
    await waitFor(() => {
      expect(screen.getByText("❌ Error extracting text from backend.")).toBeInTheDocument();
    });
  });
  
});