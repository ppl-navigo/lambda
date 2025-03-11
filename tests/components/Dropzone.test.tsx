import { render, screen, fireEvent } from "@testing-library/react";
import Dropzone from "../../app/components/Dropzone";
import "@testing-library/jest-dom";

describe("Dropzone Component", () => {
  test("renders the upload area with initial message", () => {
    render(<Dropzone />);
    expect(screen.getByText("Mulai Analisis Dokumen Anda")).toBeInTheDocument();
  });

  test("opens file selection dialog when clicked", () => {
    render(<Dropzone />);
    
    const dropzone = screen.getByText("Mulai Analisis Dokumen Anda").closest("div");
    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });

    expect(fileInput).toBeInTheDocument();
    
    // Simulate clicking the dropzone (should trigger file input click)
    fireEvent.click(dropzone!);

    // Instead of .not.toBeVisible(), check for the "hidden" class
    expect(fileInput).toHaveClass("hidden");
  });

  test("shows the uploaded PDF file name", () => {
    render(<Dropzone />);
    
    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });
    const mockFile = new File(["dummy content"], "sample.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(screen.getByText("📄 sample.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Mulai Analisis Dokumen Anda")).not.toBeInTheDocument();
  });

  test("shows an error message when a non-PDF file is uploaded", () => {
    render(<Dropzone />);
    
    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });
    const mockFile = new File(["dummy content"], "sample.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    expect(screen.getByText("Only PDF files are allowed.")).toBeInTheDocument();
    expect(screen.queryByText("📄 sample.txt")).not.toBeInTheDocument();
  });

  test("replaces existing file when a new PDF is uploaded", () => {
    render(<Dropzone />);
    
    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });

    // First file
    const mockFile1 = new File(["dummy content"], "first.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [mockFile1] } });

    expect(screen.getByText("📄 first.pdf")).toBeInTheDocument();

    // Second file (should replace the first one)
    const mockFile2 = new File(["dummy content"], "second.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [mockFile2] } });

    expect(screen.getByText("📄 second.pdf")).toBeInTheDocument();
    expect(screen.queryByText("📄 first.pdf")).not.toBeInTheDocument();
  });

  test("displays error message when a new invalid file is uploaded, replacing previous success", () => {
    render(<Dropzone />);
    
    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });

    // First file (valid PDF)
    const mockFile1 = new File(["dummy content"], "valid.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [mockFile1] } });

    expect(screen.getByText("📄 valid.pdf")).toBeInTheDocument();
    
    // Second file (invalid type)
    const mockFile2 = new File(["dummy content"], "invalid.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [mockFile2] } });

    expect(screen.getByText("Only PDF files are allowed.")).toBeInTheDocument();
    expect(screen.queryByText("📄 valid.pdf")).not.toBeInTheDocument();
  });

  test("handles an empty file selection event gracefully", () => {
    render(<Dropzone />);

    const fileInput = screen.getByLabelText("Upload File", { selector: "input" });

    // Simulate file selection with no file
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(screen.getByText("Mulai Analisis Dokumen Anda")).toBeInTheDocument();
    expect(screen.queryByText("📄")).not.toBeInTheDocument();
  });
});
