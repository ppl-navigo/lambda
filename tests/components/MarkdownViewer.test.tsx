import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import { RiskItem } from "@/app/components/MarkdownViewer";

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

// Add this near the top of your test file
beforeAll(() => {
  // Prevent crash on scrollIntoView (jsdom doesn't support it)
  window.HTMLElement.prototype.scrollIntoView = function () {};
});


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
mockedAxios.post.mockResolvedValueOnce({
  data: {
    pages_text: ["**Klausul 1:** \"Risky Text\" **Alasan:** \"Some reason.\""],
  },
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
  beforeEach(() => {
    jest.clearAllMocks();

    // 🧹 Reset global mocks
    mockedAxios.get.mockResolvedValue({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });

    mockedAxios.post.mockResolvedValue({
      data: {
        pages_text: ["**Klausul 1:** \"Risky Text\" **Alasan:** \"Some reason.\""],
      },
    });

    // ✅ Default to successful fetch streaming unless overridden
    mockFetchSuccess();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("1) Renders 'No risks found.' if pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  test("2) PDF load success & AI streaming success => we see risk items", async () => {
    jest.setTimeout(15000);
  
    // Mock the axios and fetch functions
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
    
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
  
  test("3) Displays revision when risk.revision is populated", async () => {
    // Mock AI response with risks
    mockFetchSuccess();
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
  
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/stream/uploads/test.pdf" />);
    });
  
    // Wait for the spinner to disappear
    await waitFor(() => expect(screen.queryByTestId("spinner")).toBeNull());
  
    // Verify that risks are displayed
    await waitFor(() => expect(screen.getByText(/Risky Text/i)).toBeInTheDocument());
  
    // Simulate expanding the risk item
    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
  
    // Simulate clicking the "Get Revision" button
    const reviseButton = screen.getByText(/Get Revision/i);
    fireEvent.click(reviseButton);
  
    // Wait for the revision to appear
    await waitFor(() => expect(screen.getByText(/📝 Revision:/i)).toBeInTheDocument());
  });

  test("4) Handles 'Get Revision' button click and calls onRevise", async () => {
    const mockOnRevise = jest.fn();
    const risk = {
      sectionNumber: 1,
      title: "Klausul 1",
      originalClause: "Test Risky Text",
      reason: "Test Reason",
      revisedClause: undefined,
    };
  
    render(<RiskItem risk={risk} onRevise={mockOnRevise} />);
  
    // Expand the risk item
    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
  
    // Click Get Revision
    const reviseButton = screen.getByText(/Get Revision/i);
    fireEvent.click(reviseButton);
  
    // onRevise callback should be called with the right data
    await waitFor(() => expect(mockOnRevise).toHaveBeenCalledWith(risk));
  });
  
  test("6) Exits early when pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
  
    // Verify that no risks are processed
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
  
  test("AI streaming success => we see risk items", async () => {
    jest.setTimeout(10000); // Increase timeout to avoid the default 5000ms timeout
  
    // Set up mock responses for both axios and fetch
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
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
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
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
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
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

  test("Handles backend extraction error correctly", async () => {
    // Mock the file download to succeed
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: {
        "content-type": "application/pdf",
      },
    });
  
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
  
  test("analyzeTextWithAI handles stream read error and sets error", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: dummyBlob,
      headers: { "content-type": "application/pdf" },
    });
  
    global.fetch = jest.fn(async () => {
      return {
        body: {
          getReader() {
            return {
              async read() {
                throw new Error("stream read failed"); // 👈 Forces failure *inside* the streaming loop
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
    await waitFor(() => {
      expect(screen.getByText(/gagal menganalisis dokumen/i)).toBeInTheDocument();
    });
  });
});