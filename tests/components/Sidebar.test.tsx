import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../../app/components/Sidebar";

describe("Sidebar component", () => {
  it("renders with sidebar open by default", () => {
    // Render Sidebar with sidebar open.
    render(<Sidebar isSidebarVisible={true} setIsSidebarVisible={jest.fn()} />);
    // Toggle button should show the left arrow («) when open.
    expect(screen.getByRole("button")).toHaveTextContent("«");
    // Sidebar content is rendered (e.g. header text).
    expect(screen.getByText("🔺 Alicia Koch")).toBeInTheDocument();
  });

  it("renders with sidebar closed", () => {
    // Render Sidebar with sidebar closed.
    render(<Sidebar isSidebarVisible={false} setIsSidebarVisible={jest.fn()} />);
    // Toggle button should show the right arrow (») when closed.
    expect(screen.getByRole("button")).toHaveTextContent("»");
    // The inner sidebar content should not be rendered.
    expect(screen.queryByText("🔺 Alicia Koch")).not.toBeInTheDocument();
    // Also, the search input should not be present.
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("toggles sidebar when the toggle button is clicked", () => {
    // Create a mock function to capture toggling.
    const setIsSidebarVisibleMock = jest.fn();
    render(
      <Sidebar isSidebarVisible={true} setIsSidebarVisible={setIsSidebarVisibleMock} />
    );
    const toggleButton = screen.getByRole("button");
    // Click the toggle button.
    fireEvent.click(toggleButton);
    // Expect the mock function to be called.
    expect(setIsSidebarVisibleMock).toHaveBeenCalledTimes(1);
  });

  it("filters documents based on search query", () => {
    render(<Sidebar isSidebarVisible={true} setIsSidebarVisible={jest.fn()} />);
    // Verify that the search input is rendered.
    const searchInput = screen.getByPlaceholderText("Search...");
    // By default, several documents with "Perjanjian" should appear.
    expect(screen.getAllByText(/Perjanjian/).length).toBeGreaterThan(0);
    
    // Type a search query that should match a specific document.
    fireEvent.change(searchInput, { target: { value: "Digitron" } });
    expect(
      screen.getByText("Perjanjian Kerja Sama Pengembang Web PT. Digitron")
    ).toBeInTheDocument();

    // Now type a query that does not match any documents.
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});
