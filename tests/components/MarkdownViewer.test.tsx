import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MarkdownViewer from "../../app/components/MarkdownViewer";
import axios from "axios";

// Mock axios for both GET and POST requests.
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a dummy blob with an arrayBuffer method.
const dummyBlob = new Blob(["dummy content"], { type: "application/pdf" });
dummyBlob.arrayBuffer = async () => new ArrayBuffer(8);

describe("MarkdownViewer", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders 'No risks found.' when pdfUrl is null", async () => {
    render(<MarkdownViewer pdfUrl={null} />);
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("displays error message for unexpected response format", async () => {
    // Mock GET request to return dummy blob.
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    // Mock POST request to return an unexpected response (risks not an array).
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { risks: "not an array" },
    });

    const pdfUrl = "${process.env.NEXT_PUBLIC_API_URL}/stream/uploads/test.pdf";
    render(<MarkdownViewer pdfUrl={pdfUrl} />);

    await waitFor(() => {
      expect(
        screen.getByText("⚠️ Unexpected response format.")
      ).toBeInTheDocument();
    });
  });

  test("displays error message on analysis failure", async () => {
    // Simulate an error from axios.get.
    mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

    const pdfUrl = "${process.env.NEXT_PUBLIC_API_URL}/stream/uploads/test.pdf";
    render(<MarkdownViewer pdfUrl={pdfUrl} />);

    await waitFor(() => {
      expect(
        screen.getByText("❌ Failed to analyze document. Please try again.")
      ).toBeInTheDocument();
    });
  });

  test("displays risk items with clean text and toggles expansion", async () => {
    // Prepare risk data that needs cleaning.
    const riskData = [
      {
        clause: "**Bold Clause**\n\nMore text",
        risky_text: "**Bold Risky**\n\nRisk text",
        reason: "**Bold Reason**\n\nExplanation",
      },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { risks: riskData },
    });

    const pdfUrl = "${process.env.NEXT_PUBLIC_API_URL}/stream/uploads/test.pdf";
    render(<MarkdownViewer pdfUrl={pdfUrl} />);

    // Wait until loading is complete (spinner is removed).
    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    // Check that the clause is cleaned (asterisks removed, newlines fixed).
    expect(screen.getByText(/📌 Bold Clause More text/i)).toBeInTheDocument();

    // Verify that the risk item shows an "Expand" button.
    const expandButton = screen.getByRole("button", { name: /expand/i });
    expect(expandButton).toBeInTheDocument();

    // Click the expand button to show risk details.
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/🔍 Risky Text:/i)).toBeInTheDocument();
      expect(screen.getByText(/⚠️ Reason:/i)).toBeInTheDocument();
      expect(screen.getByText(/Bold Risky Risk text/i)).toBeInTheDocument();
      expect(screen.getByText(/Bold Reason Explanation/i)).toBeInTheDocument();
    });

    // Click the collapse button (now labeled "Collapse").
    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText(/🔍 Risky Text:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/⚠️ Reason:/i)).not.toBeInTheDocument();
    });
  });

  test("displays spinner during loading", async () => {
    // Prepare simple risk data.
    const riskData = [
      { clause: "Clause", risky_text: "Risk text", reason: "Reason" },
    ];
    // Simulate a slight delay in the POST request.
    mockedAxios.get.mockResolvedValueOnce({ data: dummyBlob });
    mockedAxios.post.mockImplementationOnce(() =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve({ status: 200, data: { risks: riskData } }),
          100
        )
      )
    );

    const pdfUrl = "${process.env.NEXT_PUBLIC_API_URL}/stream/uploads/test.pdf";
    render(<MarkdownViewer pdfUrl={pdfUrl} />);

    // Immediately after render, the spinner should be visible.
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Wait for the spinner to disappear after the analysis.
    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });
  });
});
