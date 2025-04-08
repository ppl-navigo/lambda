import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MouAnalyzer from "../../app/analyze/page";

// Mock Navbar to render a simple div.
jest.mock("../../app/components/Navbar", () => () => (
  <div data-testid="navbar">Navbar</div>
));

// Mock Sidebar to always render a container with a toggle button.
// It displays "Visible" when isSidebarVisible is true and "Hidden" otherwise.
jest.mock("../../app/components/Sidebar", () => (props: {
  isSidebarVisible: boolean;
  setIsSidebarVisible: (visible: boolean) => void;
}) => (
  <div data-testid="sidebar">
    Sidebar - {props.isSidebarVisible ? "Visible" : "Hidden"}
    <button onClick={() => props.setIsSidebarVisible(!props.isSidebarVisible)}>
      Toggle Sidebar
    </button>
  </div>
));

// ✅ Fix Dropzone Mock
jest.mock("../../app/components/Dropzone", () => (props: {
  setPdfUrl: (url: string) => void;
  isSidebarVisible: boolean;
}) => (
  <div data-testid="dropzone">
    Dropzone
    <button onClick={() => props.setPdfUrl("http://test.pdf")}>Set PDF</button>
  </div>
));

// Mock Streamer to display the PDF URL.
jest.mock("../../app/components/Streamer", () => (props: { pdfUrl: string }) => (
  <div data-testid="streamer">Streamer - {props.pdfUrl}</div>
));

// Mock MarkdownViewer to display the PDF URL.
jest.mock("../../app/components/MarkdownViewer", () => (props: { pdfUrl: string }) => (
  <div data-testid="markdownViewer">MarkdownViewer - {props.pdfUrl}</div>
));

describe("MouAnalyzer", () => {
  test("renders Sidebar and Dropzone when no PDF is set", () => {
    render(<MouAnalyzer />);
    // Navbar should be rendered.
    // expect(screen.getByTestId("navbar")).toBeInTheDocument();
    // Sidebar should always be rendered.
    
    // ✅ Sidebar should always be rendered.
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    
    // ✅ Dropzone is rendered when pdfUrl is null.
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();
    
    // ✅ Neither MarkdownViewer nor Streamer should be rendered initially.
    expect(screen.queryByTestId("markdownViewer")).toBeNull();
    expect(screen.queryByTestId("streamer")).toBeNull();
  });

  test("Sidebar toggle button toggles visibility state but Sidebar remains rendered", () => {
    render(<MouAnalyzer />);
    const sidebar = screen.getByTestId("sidebar");

    // ✅ Initially, Sidebar should show "Visible"
    expect(sidebar).toHaveTextContent("Visible");

    // ✅ Get the toggle button and click it.
    const toggleButton = screen.getByText("Toggle Sidebar");
    fireEvent.click(toggleButton);

    // ✅ After toggle, Sidebar should show "Hidden" but still be rendered.
    expect(screen.getByTestId("sidebar")).toHaveTextContent("Hidden");

    // ✅ Toggle again to show "Visible".
    fireEvent.click(toggleButton);
    expect(screen.getByTestId("sidebar")).toHaveTextContent("Visible");
  });

  test("switches to analysis view (MarkdownViewer & Streamer) when PDF is set", () => {
    render(<MouAnalyzer />);

    // ✅ Ensure Dropzone is initially rendered.
    expect(screen.getByTestId("dropzone")).toBeInTheDocument();

    // ✅ Click the button in Dropzone to simulate setting a PDF URL.
    fireEvent.click(screen.getByText("Set PDF"));

    // ✅ After setting a PDF, Dropzone should no longer be rendered.
    expect(screen.queryByTestId("dropzone")).toBeNull();

    // ✅ The analysis view should now display MarkdownViewer and Streamer with the given URL.
    expect(screen.getByTestId("markdownViewer")).toHaveTextContent("http://test.pdf");
    expect(screen.getByTestId("streamer")).toHaveTextContent("http://test.pdf");
  });
});
