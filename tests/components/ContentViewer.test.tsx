import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ContentViewer from "../../app/components/ContentViewer";

// Mock textarea and MarkdownRenderer
jest.mock("../../components/ui/textarea", () => ({
  Textarea: (props: any) => (
    <textarea
      data-testid="fake-textarea"
      {...props}
    />
  ),
}));
jest.mock("../../app/utils/markdownRenderer", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div data-testid="markdown">{text}</div>,
}));

describe("ContentViewer", () => {
  const defaultProps = {
    pdfUrl: "http://example.com/sample.pdf",
    revisedText: "",
    isEditing: false,
    setRevisedText: jest.fn(),
    loading: false,
    pagesContent: [],
    riskyClausesLength: 1,
  };

  afterEach(() => jest.clearAllMocks());

  it("renders original PDF in iframe when mode is 'original'", () => {
    render(<ContentViewer {...defaultProps} mode="original" />);
    expect(screen.getByTitle("Original PDF")).toBeInTheDocument();
    expect(screen.getByTitle("Original PDF")).toHaveAttribute(
      "src",
      defaultProps.pdfUrl
    );
  });

  it("renders revised text and MarkdownRenderer in read-only mode", () => {
    const revisedText = "---PAGE_START_1---\nRevised page 1 content\n---PAGE_START_2---\nPage 2 content";
    render(
      <ContentViewer
        {...defaultProps}
        mode="revised"
        revisedText={revisedText}
        riskyClausesLength={2}
      />
    );
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });

  it("renders editable textareas in edit mode and updates revisedText", () => {
    const revisedText =
      "---PAGE_START_1---\nMy content for 1\n---PAGE_START_2---\nAnother for 2";
    const setRevisedText = jest.fn();

    render(
      <ContentViewer
        {...defaultProps}
        mode="revised"
        isEditing={true}
        revisedText={revisedText}
        riskyClausesLength={2}
        setRevisedText={setRevisedText}
      />
    );

    // Two editable textareas, one per section, correct initial values
    const allTextAreas = screen.getAllByTestId("fake-textarea");
    expect(allTextAreas).toHaveLength(2);
    expect(allTextAreas[0]).toHaveValue("My content for 1");
    expect(allTextAreas[1]).toHaveValue("Another for 2");

    // Simulate editing the first textarea
    fireEvent.change(allTextAreas[0], { target: { value: "NEW content for 1" } });

    // setRevisedText is called with correctly patched output
    expect(setRevisedText).toHaveBeenCalledWith(
      [
        "---PAGE_START_1---\nNEW content for 1\n",
        "---PAGE_START_2---\nAnother for 2\n",
      ]
        .join("")
        .trim()
    );
  });

  it("shows loading pulse if loading and not rendering revised", () => {
    render(<ContentViewer {...defaultProps} mode="revised" loading={true} />);
    expect(
      screen.getByText(/Generating revised text/i)
    ).toBeInTheDocument();
  });

  it("shows 'No content loaded yet.' if pagesContent is empty", () => {
    render(
      <ContentViewer
        {...defaultProps}
        mode="revised"
        loading={false}
        pagesContent={[]}
        revisedText=""
      />
    );
    expect(
      screen.getByText(/No content loaded yet/i)
    ).toBeInTheDocument();
  });

  it("shows green message if no risky clauses after loading", () => {
    render(
      <ContentViewer
        {...defaultProps}
        mode="revised"
        revisedText="some"
        riskyClausesLength={0}
        pagesContent={[{ sectionNumber: 1, content: "X" }]}
      />
    );
    expect(
      screen.getByText(/No risky clauses found/i)
    ).toBeInTheDocument();
  });

  it("shows 'No content loaded yet.' in fallback else branch", () => {
    // revisedText is empty, not loading, pagesContent filled, riskyClausesLength > 0
    render(
      <ContentViewer
        {...defaultProps}
        mode="revised"
        revisedText=""
        pagesContent={[{ sectionNumber: 1, content: "Test X" }]}
        riskyClausesLength={1}
      />
    );
    expect(
      screen.getByText(/No content loaded yet/i)
    ).toBeInTheDocument();
  });
});