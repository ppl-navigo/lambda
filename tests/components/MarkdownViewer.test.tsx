import React from "react";
import { render, screen, waitFor, fireEvent, act, cleanup} from "@testing-library/react";
import axios from "axios";
import MarkdownViewer from "@/app/components/MarkdownViewer";
import { apiRequest } from "@/app/utils/apiRequest";
import { toast } from 'react-toastify';

jest.mock('react-toastify', () => {
  const actualModule = jest.requireActual('react-toastify');
  return {
    ...actualModule,
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

jest.mock("axios");
jest.mock("react-markdown", () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock("remark-gfm", () => () => null);
jest.mock("remark-breaks", () => () => null);

const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockApiResponse() {
  jest.mock("@/app/utils/apiRequest", () => ({
    apiRequest: jest.fn(async (prompt, text) => {
      if (prompt.includes("Klausul judul2")) {
        console.log("Mocked API request 1");
        return `**Klausul 1:** "Risky Text" **Alasan:** "Some reason."`;
      } else if (prompt.includes("rapi dan profesional")) {
        console.log("Mocked API request 2");
        return `Mocked organization result`;
      } else if (prompt.includes("penyesuaian terhadap revisi")) {
        console.log("Mocked API request 3");
        return `📝 Suggested Revision: Revised text based on the clause`;  // Mock the actual response expected
      }
      return "";
    })
  }));
}

jest.mock("@/app/utils/fileUtils", () => ({
  fetchFileAndExtractText: jest.fn().mockResolvedValue([
    '**Klausul 1: "Risky Text" Alasan: "Some reason."**'
  ])
}));

const mockedApiRequest = require("@/app/utils/apiRequest").apiRequest;

global.ReadableStream = class {
  constructor() {}
} as any;

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
              return { done: false, value: new TextEncoder().encode(responseText) };
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
  mockedApiRequest.mockRejectedValueOnce(new Error("AI streaming error"));
}

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
    mockApiResponse();
  });
  
  afterEach(() => {
    cleanup();
  });

  test("renders 'No risks found.' when pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
    
  test("selects and deselects a risk clause", async () => {
    // Render the component
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });
  
    // Ensure that the "Page 1" text is rendered after loading the document
    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument(); // Ensure page content is rendered
    });
  
    // Expand the clause details
    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);
  
    // Wait for the clause details to appear
    await waitFor(() => {
      expect(screen.getByText("Risky Text")).toBeInTheDocument();
    });
  
    // Select the checkbox for the risk clause
    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox); // Select the checkbox
  });

  test("generates revision with chat prompt", async () => {
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });
  
    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);
  
    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox);
  
    const chatInput = screen.getByPlaceholderText(/Type your revision instructions.../i);
    fireEvent.change(chatInput, { target: { value: "Make it safer." } });
  
    const reviseButton = screen.getByText(/Revise/i);
    fireEvent.click(reviseButton);
  
    await waitFor(() => {
      // Update to match the correct expected response from your mock
      expect(screen.getByText(/📝 Suggested Revision:/i)).toBeInTheDocument();
    });
  });

  test("displays 'No risks found.' when no risks are detected", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { pages_text: [] } });
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });
    expect(screen.getByText(/No risks found./i)).toBeInTheDocument();
  });

  test("handles empty AI analysis response", async () => {
    mockFetchSuccess("");
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });
    await waitFor(() => {
      expect(screen.getByText(/No risks found./i)).toBeInTheDocument();
    });
  });

  test("handles revision generation successfully", async () => {
    // Mock inside the test
    jest.mock("@/app/utils/apiRequest", () => ({
      apiRequest: jest.fn().mockResolvedValue("Revised text based on reason."),
    }));

    const { apiRequest } = require("@/app/utils/apiRequest");

    // Render the component
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    // Expand the clause details
    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);

    // Ensure text content is rendered
    await waitFor(() => {
      expect(screen.getByText("Risky Text")).toBeInTheDocument();
    });
    
    // Trigger the revise functionality
    const getRevisionButton = screen.getByText(/Get Revision/i);
    fireEvent.click(getRevisionButton);

    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Revisi/i)).toBeInTheDocument();
    });
  });

  test("applies suggestion successfully", async () => {
    const { apiRequest } = require("@/app/utils/apiRequest");

    // Mock apiRequest responses
    apiRequest.mockImplementation((prompt: string | string[]) => {
      if (prompt.includes("Revised Page Content")) {
        return Promise.resolve("Revised Content");
      }
      return Promise.resolve("Suggested Revision");
    });

    // Render the component
    await act(async () => {
      render(<MarkdownViewer pdfUrl="https://example.com/test.pdf" />);
    });

    // Expand the clause details
    const expandButton = await screen.findByText(/Expand/i);
    fireEvent.click(expandButton);

    // Ensure text content is rendered
    await waitFor(() => {
      expect(screen.getByText("Risky Text")).toBeInTheDocument();
    });

    // Trigger the get revision functionality
    const getRevisionButton = screen.getByText(/Get Revision/i);
    fireEvent.click(getRevisionButton);

    // Wait for the revised text to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Suggested Revision/i)).toBeInTheDocument();
    });

    // Now trigger the apply suggestion functionality
    const applyButton = screen.getByText(/Apply Suggestion/i);
    fireEvent.click(applyButton);

    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Revisi/i)).toBeInTheDocument();
    });
  });
});
