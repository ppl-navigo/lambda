import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RiskClausesLayout from "@/app/components/RiskClausesLayout";

// Mock FaSpinner and ToastContainer, so output is deterministic
jest.mock("react-toastify", () => ({
  ToastContainer: () => <div data-testid="mock-toast" />,
}));
jest.mock("react-icons/fa", () => ({
  FaSpinner: (props: any) => <svg data-testid="spinner" {...props} />,
}));

// Mock RiskItem to ensure we're only testing the layout here
jest.mock("@/app/components/RiskItem", () => (props: any) => (
  <div data-testid={`risk-item-${props.risk.id}`}>
    FAKE_RISKITEM_{props.risk.id}
    <button onClick={() => props.onSelect(props.risk.id, !props.isSelected)}>
      Toggle
    </button>
    <button onClick={() => props.onRevise(props.risk)}>Revise</button>
    <button onClick={() => props.onApply(props.risk)}>Apply</button>
  </div>
));

const makeRisk = (id: string, sectionNumber = 1) => ({
  id,
  sectionNumber,
  title: "title",
  originalClause: "original",
  reason: "reason",
  currentClause: "original",
  revisedClause: "",
});

describe("RiskClausesLayout", () => {
  const baseProps = {
    totalPages: 10,
    isGenerating: false,
    risks: [],
    loading: false,
    processedPages: [],
    error: "",
    selectedRisks: new Set<string>(),
    loadingStates: {},
    handleSelectClause: jest.fn(),
    handleRevise: jest.fn(),
    handleApplySuggestion: jest.fn(),
    chatPrompt: "",
    setChatPrompt: jest.fn(),
    isSending: false,
    handleSendPrompt: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  it("renders spinner when loading and no processed pages", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        loading={true}
        processedPages={[]}
      />
    );
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders error message if error exists", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        error="My error"
      />
    );
    expect(screen.getByText("My error")).toBeInTheDocument();
  });

  it("renders 'No risks found.' when not loading, no error, and no risks", () => {
    render(<RiskClausesLayout {...baseProps} />);
    expect(screen.getByText(/No risks found/i)).toBeInTheDocument();
  });

  it("renders grouped risks by sectionNumber and calls callbacks", () => {
    const risks = [
    makeRisk("a", 1),
    makeRisk("b", 1),
    makeRisk("c", 2),
  ];
  const handleSelect = jest.fn();
  const handleRevise = jest.fn();
  const handleApply = jest.fn();
  render(
    <RiskClausesLayout
      {...baseProps}
      risks={risks}
      processedPages={[1, 2]} // Add processed pages here
      handleSelectClause={handleSelect}
      handleRevise={handleRevise}
      handleApplySuggestion={handleApply}
    />
  );
    // 2 groups: Page 1 and Page 2
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.getByTestId("risk-item-a")).toBeInTheDocument();
    expect(screen.getByTestId("risk-item-b")).toBeInTheDocument();
    expect(screen.getByTestId("risk-item-c")).toBeInTheDocument();

    // Test interaction/callbacks for custom RiskItem
    fireEvent.click(screen.getAllByText("Toggle")[0]); // a
    expect(handleSelect).toHaveBeenCalledWith("a", true);

    fireEvent.click(screen.getAllByText("Revise")[0]); // a
    expect(handleRevise).toHaveBeenCalledWith(risks[0]);

    fireEvent.click(screen.getAllByText("Apply")[1]); // b
    expect(handleApply).toHaveBeenCalledWith(risks[1]);
  });

  it("text input is enabled/disabled with selectedRisks and updates on change", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        selectedRisks={new Set(["foo"])}
        chatPrompt="abc"
        setChatPrompt={baseProps.setChatPrompt}
      />
    );
    // Should be enabled and have correct placeholder
    const input = screen.getByPlaceholderText(/Type your revision instructions/i);
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: "My edit" } });
    expect(baseProps.setChatPrompt).toHaveBeenCalledWith("My edit");
  });

  it("text input is disabled with no selected risks and shows correct placeholder", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        selectedRisks={new Set()}
      />
    );
    const input = screen.getByPlaceholderText(/Select clauses to revise/i);
    expect(input).toBeDisabled();
  });

  it("revise button is disabled/enabled and triggers handler", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        selectedRisks={new Set(["something"])}
        isSending={false}
      />
    );
    const button = screen.getByText(/Revise/i);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(baseProps.handleSendPrompt).toHaveBeenCalled();
  });

  it("revise button shows 'Generating...' if isSending", () => {
    render(
      <RiskClausesLayout
        {...baseProps}
        selectedRisks={new Set(["foo"])}
        isSending={true}
      />
    );
    const button = screen.getByText(/Generating/i);
    expect(button).toBeDisabled();
  });

  
});