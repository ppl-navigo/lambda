import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MarkdownViewer from "../../app/components/MarkdownViewer";
import axios from "axios";

// Mock axios for both GET and POST requests.
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MarkdownViewer component", () => {
  const dummyPdfUrl = "${process.env.NEXT_PUBLIC_API_URL}/stream/uploads/test.pdf";

  // Create a dummy blob response with an arrayBuffer method.
  const dummyBlob = new Blob(["dummy content"], { type: "application/pdf" });
  dummyBlob.arrayBuffer = async () => new ArrayBuffer(8);

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("displays loading spinner and then shows 'No risks found.' when analysis returns empty array", async () => {
    // Setup axios GET and POST to resolve with an empty risks array.
    mockedAxios.get.mockResolvedValue({ data: dummyBlob });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { risks: [] } });

    render(<MarkdownViewer pdfUrl={dummyPdfUrl} />);

    // The spinner should be visible initially.
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Wait for analysis to finish and then "No risks found." should appear.
    await waitFor(() =>
      expect(screen.getByText("No risks found.")).toBeInTheDocument()
    );
  });

  test("displays error message on unexpected response format", async () => {
    // Setup GET to succeed and POST to return an unexpected format.
    mockedAxios.get.mockResolvedValue({ data: dummyBlob });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { risks: "not an array" },
    });

    render(<MarkdownViewer pdfUrl={dummyPdfUrl} />);

    // Wait for error message to be shown.
    await waitFor(() =>
      expect(screen.getByText("⚠️ Unexpected response format.")).toBeInTheDocument()
    );
  });

  test("displays error message on analysis failure", async () => {
    // Setup axios GET to fail.
    const networkError = new Error("Network error");
    mockedAxios.get.mockRejectedValue(networkError);

    // Suppress console.error for this test.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<MarkdownViewer pdfUrl={dummyPdfUrl} />);

    // Wait for error message to be shown.
    await waitFor(() =>
      expect(
        screen.getByText("❌ Failed to analyze document. Please try again.")
      ).toBeInTheDocument()
    );
    consoleErrorSpy.mockRestore();
  });

  test("does not trigger analysis when pdfUrl is null", () => {
    render(<MarkdownViewer pdfUrl={null} />);
    // When pdfUrl is null, analysis isn't triggered and "No risks found." is shown.
    expect(screen.getByText("No risks found.")).toBeInTheDocument();
    // axios.get/post should not have been called.
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
