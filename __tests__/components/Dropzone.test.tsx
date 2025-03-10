import React from "react";
import { render, fireEvent, waitFor, act, screen } from "@testing-library/react";
import Dropzone from "../../app/components/Dropzone";
import axios from "axios";

// Mock axios so that we can control its behavior.
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Dropzone Component", () => {
  const setPdfUrl = jest.fn();
  const defaultProps = { setPdfUrl, isSidebarVisible: true };

  beforeEach(() => {
    setPdfUrl.mockClear();
    mockedAxios.post.mockClear();
  });

  it("renders the dropzone when no file is selected", () => {
    render(<Dropzone {...defaultProps} />);
    expect(
      screen.getByText(/Drag & drop a PDF here, or click to select one/i)
    ).toBeInTheDocument();
  });

  it("selects a valid PDF file and displays its name", async () => {
    const { getByTestId, queryByText, container } = render(
      <Dropzone {...defaultProps} />
    );
    const file = new File(["dummy content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector("input");
    if (input) {
      Object.defineProperty(input, "files", {
        value: [file],
      });
      fireEvent.change(input);
    }
    await waitFor(() => {
      expect(getByTestId("selected-file")).toHaveTextContent("test.pdf");
      expect(queryByText("Only PDF files are allowed")).toBeNull();
    });
  });

  it("deletes the selected file when 'Delete File' button is clicked", async () => {
    const { getByTestId, getByText, queryByTestId, container } = render(
      <Dropzone {...defaultProps} />
    );
    const file = new File(["dummy content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector("input");
    if (input) {
      Object.defineProperty(input, "files", {
        value: [file],
      });
      fireEvent.change(input);
    }
    await waitFor(() => {
      expect(getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });
    // Click the delete button.
    const deleteButton = getByText("Delete File");
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(queryByTestId("selected-file")).toBeNull();
    });
  });

  it("uploads a file and calls setPdfUrl on success", async () => {
    // Mock a successful upload response.
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { file_path: "uploaded.pdf" },
    });
    const { getByTestId, getByText, container } = render(
      <Dropzone {...defaultProps} />
    );
    const file = new File(["dummy content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector("input");
    if (input) {
      Object.defineProperty(input, "files", {
        value: [file],
      });
      fireEvent.change(input);
    }
    await waitFor(() => {
      expect(getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });
    const uploadButton = getByText("Upload");
    await act(async () => {
      fireEvent.click(uploadButton);
    });
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://localhost:8000/upload/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(setPdfUrl).toHaveBeenCalledWith("http://localhost:8000/stream/uploaded.pdf");
    });
  });

  it("does not render the upload button when no file is selected", () => {
    const { queryByText } = render(<Dropzone {...defaultProps} />);
    // Since no file is selected, the upload button should not be in the document.
    expect(queryByText("Upload")).toBeNull();
  });

  it("handles upload failure gracefully", async () => {
    // Simulate axios post failure
    mockedAxios.post.mockRejectedValue(new Error("Upload error"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { getByTestId, getByText, container } = render(
      <Dropzone {...defaultProps} />
    );
    const file = new File(["dummy content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector("input");
    if (input) {
      Object.defineProperty(input, "files", {
        value: [file],
      });
      fireEvent.change(input);
    }
    await waitFor(() => {
      expect(getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });
    const uploadButton = getByText("Upload");
    await act(async () => {
      fireEvent.click(uploadButton);
    });
    // On failure, setPdfUrl should not be called.
    await waitFor(() => {
      expect(setPdfUrl).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });
});
