import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../../app/components/Sidebar";
import "@testing-library/jest-dom";

describe("Sidebar Component", () => {
  test("renders the sidebar with user name and search box", () => {
    render(<Sidebar />);
    
    expect(screen.getByText("🔺 Alicia Koch")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  test("filters documents based on search input", () => {
    render(<Sidebar />);

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Programmer" } });

    expect(screen.getAllByText(/Perjanjian Kontrak Kerja Programmer Navigo/i).length).toBeGreaterThan(0);
  });

  test("shows 'No results found' when no documents match the search", () => {
    render(<Sidebar />);

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "random text" } });

    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});
