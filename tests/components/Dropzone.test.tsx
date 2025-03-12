import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import Dropzone from "../../app/components/Dropzone";
import axios from "axios";
import { useDropzone } from "react-dropzone";

// Mock axios untuk API calls
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
    // Memastikan tampilan default dropzone muncul
    expect(
      screen.getByText(/Drag & drop a PDF here, or click to select one/i)
    ).toBeInTheDocument();
  });

  it("selects a valid PDF file and displays its name", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });
  });

  it("does nothing when no files are selected", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;
    // Simulasikan event change dengan FileList kosong
    fireEvent.change(input, { target: { files: [] } });
    await waitFor(() => {
      // Karena tidak ada file yang diterima, tidak ada elemen selected-file yang muncul
      expect(screen.queryByTestId("selected-file")).toBeNull();
    });
  });

  it("shows drag active message when isDragActive is true", () => {
    // Mock useDropzone untuk memaksa isDragActive menjadi true
    jest.spyOn(require("react-dropzone"), "useDropzone").mockImplementation((options) => {
      return {
        getRootProps: () => ({}),
        getInputProps: () => ({}),
        isDragActive: true,
      };
    });
    render(<Dropzone {...defaultProps} />);
    expect(screen.getByText("Drop the PDF file here...")).toBeInTheDocument();
    jest.restoreAllMocks();
  });

  it("deletes the selected file when 'X' button is clicked", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("selected-file")).toBeNull();
    });
  });

  it("uploads a file and calls setPdfUrl on success", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { file_path: "uploaded.pdf" },
    });

    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });

    fireEvent.click(screen.getByText("Upload"));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/upload/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(setPdfUrl).toHaveBeenCalledWith("http://127.0.0.1:8000/stream/uploaded.pdf");
    });
  });

  it("handles upload failure gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockedAxios.post.mockRejectedValue(new Error("Upload error"));

    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });

    fireEvent.click(screen.getByText("Upload"));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(setPdfUrl).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("does not render the upload button when no file is selected", () => {
    render(<Dropzone {...defaultProps} />);
    expect(screen.queryByText("Upload")).toBeNull();
  });
});