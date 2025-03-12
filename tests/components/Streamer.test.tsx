import React from "react";
import { render, screen } from "@testing-library/react";
import Streamer from "../../app/components/Streamer";

describe("Streamer component", () => {
  test("renders null when pdfUrl is not provided", () => {
    // Since pdfUrl is required but our component returns null if falsy,
    // we can pass an empty string to simulate "no pdfUrl".
    const { container } = render(<Streamer pdfUrl="" />);
    expect(container.firstChild).toBeNull();
  });

  test("renders an iframe with the correct src and title when pdfUrl is provided", () => {
    const testPdfUrl = "http://example.com/test.pdf";
    render(<Streamer pdfUrl={testPdfUrl} />);
    // The iframe should be rendered with the provided pdfUrl.
    const iframeElement = screen.getByTitle("PDF Viewer");
    expect(iframeElement).toBeInTheDocument();
    expect(iframeElement).toHaveAttribute("src", testPdfUrl);
  });
});
