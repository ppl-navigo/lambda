import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import Dropzone from "../../app/components/Dropzone";

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

const mkFile = (name: string, size: number, type = "application/pdf") =>
  new File([new ArrayBuffer(size)], name, { type });

/* Cloudinary /api/upload mock – SUCCESS */
const successFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ url: "https://res.cloudinary.com/demo/sample.pdf" }),
  })
) as jest.Mock;

/* Cloudinary /api/upload mock – FAILURE */
const failFetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: "Upload error" }),
  })
) as jest.Mock;

describe("Dropzone Component (Cloudinary)", () => {
  const setPdfUrl = jest.fn();
  const defaultProps = { setPdfUrl, isSidebarVisible: true };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = successFetch;
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
      expect(setPdfUrl).toHaveBeenCalledWith("https://res.cloudinary.com/demo/sample.pdf");
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

  it("rejects non‑PDF file", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input")!;

    const bad = mkFile("image.png", 1000, "image/png");
    fireEvent.change(input, { target: { files: [bad] } });

    expect(await screen.findByText(/Only PDF files are allowed/)).toBeInTheDocument();
  });

  it("rejects file larger than 10 MB", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input")!;

    const big = mkFile("big.pdf", 11 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [big] } });

    expect(await screen.findByText(/File size cannot be larger than 10MB/)).toBeInTheDocument();
  });

  it("aborts upload when X is clicked while uploading", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input")!;

    fireEvent.change(input, { target: { files: [mkFile("ok.pdf", 1000)] } });
    fireEvent.click(await screen.findByText("Upload"));

    // button should turn yellow (isUploading) then we click X
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    // fetch must have been called once then nothing else & url not set
    expect(successFetch).toHaveBeenCalledTimes(1);
    expect(setPdfUrl).not.toHaveBeenCalled();
  });

  it("uploads file via /api/upload and calls setPdfUrl", async () => {
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input")!;

    fireEvent.change(input, { target: { files: [mkFile("ok.pdf", 1000)] } });
    fireEvent.click(await screen.findByText("Upload"));

    await waitFor(() => expect(setPdfUrl).toHaveBeenCalledWith(expect.stringContaining("sample.pdf")));
    expect(global.fetch).toHaveBeenCalledWith("/api/upload", expect.any(Object));
  });

  it("handles upload failure", async () => {
    global.fetch = failFetch;
    render(<Dropzone {...defaultProps} />);
    const input = screen.getByRole("presentation").querySelector("input")!;

    fireEvent.change(input, { target: { files: [mkFile("ok.pdf", 1000)] } });
    fireEvent.click(await screen.findByText("Upload"));

    await waitFor(() => expect(setPdfUrl).not.toHaveBeenCalled());
  });
});
