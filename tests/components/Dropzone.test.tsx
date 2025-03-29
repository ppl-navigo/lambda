import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import Dropzone from "../../app/components/Dropzone";
import { useDropzone } from "react-dropzone";

// Mock `fetch` to simulate Cloudinary API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        secure_url: "https://res.cloudinary.com/dat7hvo77/sample.pdf",
      }),
  })
) as jest.Mock;

describe("Dropzone Component (Cloudinary)", () => {
  const setPdfUrl = jest.fn();
  const defaultProps = { setPdfUrl, isSidebarVisible: true };

  beforeEach(() => {
    setPdfUrl.mockClear();
    jest.clearAllMocks();
  });

  it("renders the dropzone when no file is selected", () => {
    render(<Dropzone {...defaultProps} />);
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
    fireEvent.change(input, { target: { files: [] } });

    await waitFor(() => {
      expect(screen.queryByTestId("selected-file")).toBeNull();
    });
  });

  it("shows drag active message when isDragActive is true", () => {
    jest.spyOn(require("react-dropzone"), "useDropzone").mockImplementation(() => {
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

  it("uploads a file to Cloudinary and calls setPdfUrl on success", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });

    const uploadButton = screen.getByText("Upload");
    expect(uploadButton).not.toBeDisabled();

    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        expect.any(Object)
      );
      expect(setPdfUrl).toHaveBeenCalledWith("https://res.cloudinary.com/dat7hvo77/sample.pdf");
    });
  });

  it("handles upload failure gracefully", async () => {
    // Mock a failed upload response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: "Upload error" },
          }),
      })
    ) as jest.Mock;

    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input") as HTMLInputElement;

    const file = new File(["dummy content"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("selected-file")).toHaveTextContent("test.pdf");
    });

    fireEvent.click(screen.getByText("Upload"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(setPdfUrl).not.toHaveBeenCalled();
    });
  });

  it("does not render the upload button when no file is selected", () => {
    render(<Dropzone {...defaultProps} />);
    expect(screen.queryByText("Upload")).toBeNull();
  });
});
