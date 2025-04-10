import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock TextStreamer
jest.mock('../../app/utils/textStreamer', () => ({
  TextStreamer: {
    simulateStream: jest.fn((text, delay, chunkSize, callback) => {
      // Immediately call callback with the text
      callback(text);
      return Promise.resolve();
    }),
  },
}));

// Mock ReadableStream for Jest
global.ReadableStream = require('web-streams-polyfill').ReadableStream;
global.fetch = jest.fn();

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('remark-gfm', () => jest.fn());
jest.mock('remark-breaks', () => jest.fn());

// Mock icons
jest.mock('lucide-react', () => ({
  Pencil: () => <svg data-testid="pencil-icon" />,
  Save: () => <svg data-testid="save-icon" />,
  RefreshCcw: () => <svg data-testid="refresh-icon" />,
}));

describe('Streamer component', () => {
  const renderWithStore = (override = {}) => {
    Object.assign(mockState, override);
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);
  };
  
  let mockUseMouStore: any;
  let mockState: any;
  let Streamer: any;

  beforeAll(() => {
    mockState = {
      pagesContent: [],
      riskyClauses: [],
      setPagesContent: jest.fn(),
      setRiskyClauses: jest.fn(),
      updatePageContent: jest.fn(),
    };

    mockUseMouStore = jest.fn(() => mockState);
    mockUseMouStore.getState = () => mockState;

    jest.doMock('@/app/store/useMouStore', () => ({
      useMouStore: mockUseMouStore,
    }));

    Streamer = require('@/app/components/Streamer').default;
  });

  test('renders iframe for original PDF', () => {
    renderWithStore();
    const iframe = screen.getByTitle('Original PDF');
    expect(iframe).toHaveAttribute('src', "http://example.com/test.pdf");
  });

  test('shows "No content loaded yet" if no pagesContent', () => {
    renderWithStore();
    fireEvent.click(screen.getByText(/Generate Revised Text/i));
    expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
  });

  test('shows "No risky clauses found" if pagesContent exists but riskyClauses is empty', () => {
    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Sample text' }],
      riskyClauses: [],
    });

    fireEvent.click(screen.getByText(/Generate Revised Text/i));
    expect(screen.getByText(/No risky clauses found/i)).toBeInTheDocument();
  });

  test('generates and displays revised text', async () => {
    // Set up the initial state with content and risky clauses
    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Original content' }],
      riskyClauses: [{ sectionNumber: 1, title: '', originalClause: '', reason: '' }],
    });

    // Click the "Generate Revised Text" button
    fireEvent.click(screen.getByText(/Generate Revised Text/i));

    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.queryByText(/Processing.../i)).not.toBeInTheDocument();
    });

    // Since we're using MarkdownRenderer, we need to look for the content within the rendered markdown
    await waitFor(() => {
      const pageContent = screen.getByText(/Original content/i);
      expect(pageContent).toBeInTheDocument();
    });

    // Verify that the revision buttons are visible
    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
  });    

  test('allows editing of revised text in textareas', async () => {
    // Initial state with content and risky clauses to enable editing
    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Original content' }],
      riskyClauses: [{ sectionNumber: 1, title: '', originalClause: '', reason: '' }],
    });

    // Generate revised text
    fireEvent.click(screen.getByText(/Generate Revised Text/i));
    await waitFor(() => {
      expect(screen.queryByText(/Processing.../i)).not.toBeInTheDocument();
    });

    // Toggle edit mode
    fireEvent.click(screen.getByTestId('pencil-icon'));

    // Textarea should be present with initial content
    const textarea = screen.getByDisplayValue(/Original content/i);
    expect(textarea).toBeInTheDocument();

    // Simulate user editing the content
    fireEvent.change(textarea, { target: { value: 'Edited content' } });

    // Save the changes
    fireEvent.click(screen.getByTestId('save-icon'));

    // Verify that the updatePageContent function was called with the updated content
    await waitFor(() => {
      expect(mockState.updatePageContent).toHaveBeenCalledWith(1, 'Edited content');
    });
  });
});