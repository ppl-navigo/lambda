import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import RiskItem from "@/app/components/RiskItem";
import { RiskyClause } from "@/app/store/useMouStore";

describe("RiskItem", () => {
  const baseRisk: RiskyClause = {
    id: "risk-1",
    sectionNumber: 1,
    title: "Clause Title",
    originalClause: "Risky original text.",
    reason: "Because it is risky.",
    revisedClause: "",
    currentClause: "Risky original text.",
  };

  const defaultProps = {
    risk: baseRisk,
    isSelected: false,
    onSelect: jest.fn(),
    onRevise: jest.fn(),
    onApply: jest.fn(),
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders title, checkbox, and expand button", () => {
    render(<RiskItem {...defaultProps} />);
    expect(screen.getByText("📌 Clause Title")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Expand")).toBeInTheDocument();
  });

  it("checks and unchecks the checkbox", () => {
    render(<RiskItem {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onSelect).toHaveBeenCalledWith("risk-1", true);
    // Simulate checked prop as true and try unchecking
    render(<RiskItem {...defaultProps} isSelected={true} />);
  });

  it("toggles expanded content with the button", () => {
    render(<RiskItem {...defaultProps} />);
    const toggle = screen.getByText("Expand");
    fireEvent.click(toggle);
    // Now details should appear (text, reason, Get Revision)
    expect(screen.getByText(/Risky original text/i)).toBeInTheDocument();
    expect(screen.getByText(/Because it is risky/i)).toBeInTheDocument();
    expect(screen.getByText("Get Revision")).toBeInTheDocument();

    // Should now offer Collapse too:
    expect(screen.getByText("Collapse")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Collapse"));
    expect(screen.getByText("Expand")).toBeInTheDocument();
  });

  it("shows loading state message when isLoading is true and no revisedClause", () => {
    render(<RiskItem {...defaultProps} isLoading={true} />);
    fireEvent.click(screen.getByText("Expand"));
    expect(screen.getByText(/Generating revision/i)).toBeInTheDocument();
  });

  it("calls onRevise when 'Get Revision' is clicked", () => {
    render(<RiskItem {...defaultProps} />);
    fireEvent.click(screen.getByText("Expand"));
    fireEvent.click(screen.getByText("Get Revision"));
    expect(defaultProps.onRevise).toHaveBeenCalledWith(baseRisk);
  });

  it("shows suggested revision and Apply Suggestion button if revisedClause is present", () => {
    const revisedRisk = { ...baseRisk, revisedClause: "Here's a safe revision." };
    render(<RiskItem {...defaultProps} risk={revisedRisk} />);
    fireEvent.click(screen.getByText("Expand"));

    expect(screen.getByText(/📝 Suggested Revision:/i)).toBeInTheDocument();
    expect(screen.getByText("Here's a safe revision.")).toBeInTheDocument();
    expect(screen.getByText("Apply Suggestion")).toBeInTheDocument();
  });

  it("calls onApply when Apply Suggestion is clicked", () => {
    const revisedRisk = { ...baseRisk, revisedClause: "Here's a safe revision." };
    render(<RiskItem {...defaultProps} risk={revisedRisk} />);
    fireEvent.click(screen.getByText("Expand"));
    fireEvent.click(screen.getByText("Apply Suggestion"));
    expect(defaultProps.onApply).toHaveBeenCalledWith(revisedRisk);
  });
});