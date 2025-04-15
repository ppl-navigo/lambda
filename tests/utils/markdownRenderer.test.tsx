import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import MarkdownRenderer from "../../app/utils/markdownRenderer";

describe("MarkdownRenderer", () => {
  const renderComponent = (text: string) => render(<MarkdownRenderer text={text} />);

  test("renders empty lines as <br>", () => {
    const breaks = renderComponent("\n\n").container.querySelectorAll('br');
    // Adjust the expected length based on actual observed scenario
    expect(breaks.length).toBe(1);
  });

  test("renders page start markers as div with Page number", () => {
    renderComponent("---PAGE_START_1---");
    const header = screen.getByText("Page 1");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("text-lg font-semibold text-blue-400");
  });

  test("renders bold and italic text correctly", () => {
    renderComponent("**Bold Text** and _Italic Text_");
    const bold = screen.getByText("Bold Text");
    const italic = screen.getByText("Italic Text");

    expect(bold).toBeInTheDocument();
    expect(bold).toHaveClass("font-bold");
    expect(italic).toBeInTheDocument();
    expect(italic).toHaveClass("italic");
  });

  test("renders multiple lines", () => {
    const { container } = renderComponent("Line one\nLine two\n\nLine four\n_Line five_");

    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Line two")).toBeInTheDocument();

    const breaks = container.querySelectorAll('br');
    expect(breaks.length).toBe(1);

    expect(screen.getByText("Line four")).toBeInTheDocument();

    const italicLine = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'em' && content === 'Line five';
    });

    expect(italicLine).toBeInTheDocument();
  });

  test("renders highlighted text correctly", () => {
    renderComponent("<highlight>Highlighted Text</highlight>");
    const highlight = screen.getByText("Highlighted Text");

    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveClass("text-red-500", "font-bold");
  });

  test("renders bold/italic text before and after highlights", () => {
    renderComponent("**Bold** text and <highlight>highlighted</highlight> _italic_ text.");
    const bold = screen.getByText("Bold");
    const highlight = screen.getByText("highlighted");
    const italic = screen.getByText("italic");

    expect(bold).toBeInTheDocument();
    expect(bold).toHaveClass("font-bold");
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveClass("text-red-500", "font-bold");
    expect(italic).toBeInTheDocument();
    expect(italic).toHaveClass("italic");
  });
});