import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import axios from "axios";
import MarkdownViewer from "@/app/components/MarkdownViewer";
import { useMouStore } from "@/app/store/useMouStore";

jest.mock("axios");
jest.mock("react-markdown", () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock("remark-gfm", () => () => null);
jest.mock("remark-breaks", () => () => null);

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Polyfill ReadableStream
global.ReadableStream = class {
  constructor() {}
} as any;

// Mock fetch for AI streaming
function mockFetchSuccess(responseText: string) {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    body: {
      getReader() {
        let callCount = 0;
        return {
          async read() {
            callCount++;
            if (callCount === 1) {
              return {
                done: false,
                value: new TextEncoder().encode(responseText),
              };
            } else {
              return { done: true, value: undefined };
            }
          },
        };
      },
    },
    json: async () => ({}),
    text: async () => responseText,
  }) as unknown as Response);
}

function mockFetchFail() {
  global.fetch = jest.fn(() => {
    throw new Error("AI streaming error");
  });
}

// Dummy Blob for file uploads
const dummyBlob = new Blob(["dummy content"], { type: "application/octet-stream" });
(dummyBlob as any).arrayBuffer = async () => new ArrayBuffer(8);

describe("MarkdownViewer Component Tests (Fully Mocked)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: dummyBlob,
      headers: { "content-type": "application/pdf" },
    });
    mockedAxios.post.mockResolvedValue({
      data: {
        pages_text: ["**Klausul 1:** \"Risky Text\" **Alasan:** \"Some reason.\""],
      },
    });
    mockFetchSuccess(`**Klausul 1:** "Risky Text" **Alasan:** "Some reason."`);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Mock rendering when pdfUrl is null
  test("renders 'No risks found.' when pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  // Mock backend extraction error handling
  test("handles backend text extraction error", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Extraction failed"));

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/❌ Error extracting text from backend./i)).toBeInTheDocument();
    });
  });

  // Mock AI streaming failure
  test("handles AI streaming failure", async () => {
    mockFetchFail();

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Gagal menganalisis dokumen/i)).toBeInTheDocument();
    });
  });

  // Mock risk selection and deselection
  test("selects and deselects a risk clause", async () => {
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);

    const selectButton = await screen.findByText(/Select Clause/i);
    fireEvent.click(selectButton);

    expect(screen.getByText(/Deselect/i)).toBeInTheDocument();

    fireEvent.click(selectButton);
    expect(screen.getByText(/Select Clause/i)).toBeInTheDocument();
  });

  // Mock revision generation with chat prompt
  test("generates revision with chat prompt", async () => {
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);

    const selectButton = await screen.findByText(/Select Clause/i);
    fireEvent.click(selectButton);

    const chatInput = screen.getByPlaceholderText(/Type your revision instructions.../i);
    fireEvent.change(chatInput, { target: { value: "Make it safer." } });

    const reviseButton = screen.getByText(/Revise/i);
    fireEvent.click(reviseButton);

    await waitFor(() => {
      expect(screen.getByText(/📝 Revision Generated on Revised Document Section/i)).toBeInTheDocument();
    });
  });

  // Mock revision fails due to missing risk selection
  test("fails to generate revision without selecting a risk", async () => {
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    const chatInput = screen.getByPlaceholderText(/Select a clause to revise.../i);
    fireEvent.change(chatInput, { target: { value: "Make it safer." } });

    const reviseButton = screen.getByText(/Revise/i);
    fireEvent.click(reviseButton);

    expect(screen.queryByText(/📝 Revision Generated on Revised Document Section/i)).not.toBeInTheDocument();
  });

  // Mock no risks found
  test("displays 'No risks found.' when no risks are detected", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { pages_text: [] } });

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    expect(screen.getByText(/No risks found./i)).toBeInTheDocument();
  });

  // Mock empty response from AI analysis
  test("handles empty AI analysis response", async () => {
    mockFetchSuccess("");

    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No risks found./i)).toBeInTheDocument();
    });
  });

});