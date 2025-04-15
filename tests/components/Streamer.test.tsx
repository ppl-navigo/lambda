import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Streamer from '../../app/components/Streamer'; // Relative import

// Mock TextStreamer
jest.mock('../../app/utils/textStreamer', () => ({
  TextStreamer: {
    simulateStream: jest.fn(async (text, delay, chunkSize, callback) => {
      const chunks = text.match(/.{1,10}/g) || [];
      for (const chunk of chunks) {
        callback(chunk);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }),
  },
}));

// Mock markdownRenderer
jest.mock('../../app/utils/markdownRenderer', () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => (
    <div data-testid="markdown-content">{text}</div>
  ),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ReadableStream for Jest
global.ReadableStream = require('web-streams-polyfill').ReadableStream;
global.fetch = jest.fn();

// Mock react-markdown
jest.mock('react-markdown', () => (props: { children: React.ReactNode }) => <div>{props.children}</div>);
jest.mock('remark-gfm', () => jest.fn());
jest.mock('remark-breaks', () => jest.fn());

describe('Streamer component', () => {
  const renderWithStore = (override = {}) => {
    Object.assign(mockState, override);
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);
  };

  let mockUseMouStore: any;
  let mockState: any;

  beforeEach(() => {
    mockState = {
      pagesContent: [],
      riskyClauses: [],
      setPagesContent: jest.fn(),
      setRiskyClauses: jest.fn(),
      updatePageContent: jest.fn(),
    };
    mockUseMouStore = jest.fn(() => mockState);
    mockUseMouStore.getState = () => mockState;
    jest.doMock('../../app/store/useMouStore', () => ({
      useMouStore: mockUseMouStore,
    }));
  });

  test('shows "No content loaded yet" when revised text generation fails', async () => {
    const originalSimulateStream = jest.requireMock('../../app/utils/textStreamer').TextStreamer.simulateStream;
    jest.requireMock('../../app/utils/textStreamer').TextStreamer.simulateStream = jest.fn(() => Promise.resolve());

    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Content' }],
      riskyClauses: [{}],
    });

    fireEvent.click(screen.getByText(/Revised Document/i));
    await waitFor(() => {
      expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
    });

    jest.requireMock('../../app/utils/textStreamer').TextStreamer.simulateStream = originalSimulateStream;
  });

  // test('renders revised markdown when section matches', async () => {
  //   renderWithStore({
  //     pagesContent: [{ sectionNumber: 1, content: 'Original content' }],
  //     riskyClauses: [{
  //       sectionNumber: 1,
  //       originalClause: 'Original',
  //       revisedClause: 'This is the new revised clause.',
  //       title: 'Clause Title',
  //       reason: 'Because reasons.',
  //     }],
  //   });

  //   fireEvent.click(screen.getByText(/Revised Document/i));

  //   await waitFor(() => {
  //     expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  //     expect(screen.getByTestId('markdown-content')).toHaveTextContent(/PAGE_START_1/);
  //     expect(screen.getByTestId('markdown-content')).toHaveTextContent(/This is the new revised clause/);
  //   });
  // });

  // test('textarea height adjusts when content is empty', async () => {
  //   renderWithStore({
  //     pagesContent: [{ sectionNumber: 1, content: 'Original' }],
  //     riskyClauses: [{ sectionNumber: 1 }],
  //   });

  //   fireEvent.click(screen.getByText(/Revised Document/i));

  //   await waitFor(() => {
  //     expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  //   });

  //   fireEvent.click(screen.getByTestId('edit-toggle-button'));

  //   const textarea = screen.getByRole('textbox');
  //   fireEvent.change(textarea, { target: { value: '' } });

  //   await waitFor(() => {
  //     expect(textarea).toHaveStyle('height: auto');
  //   });
  // });

  // test('revisedText updates after saving edits', async () => {
  //   renderWithStore({
  //     pagesContent: [{ sectionNumber: 1, content: 'Original' }],
  //     riskyClauses: [{}],
  //   });

  //   fireEvent.click(screen.getByText(/Revised Document/i));
  //   await waitFor(() => {
  //     expect(screen.getByText(/Original/i)).toBeInTheDocument();
  //   });

  //   fireEvent.click(screen.getByTestId('pencil-icon')); // Click the pencil icon to start editing
  //   const textarea = screen.getByRole('textbox');
  //   fireEvent.change(textarea, { target: { value: 'Edited' } });
  //   fireEvent.click(screen.getByTestId('save-icon')); // Save the edit

  //   await waitFor(() => {
  //     expect(screen.getByText(/Edited/i)).toBeInTheDocument();
  //   });
  // });

  // test('simulateStream is called with revised clause', async () => {
  //   const spy = jest.fn();
  //   const { TextStreamer } = require('../../app/utils/textStreamer');
  //   TextStreamer.simulateStream.mockImplementation(async (text, _, __, callback) => {
  //     spy(text);
  //     callback(text);
  //   });

  //   renderWithStore({
  //     pagesContent: [{ sectionNumber: 1, content: 'Original Content' }],
  //     riskyClauses: [{
  //       sectionNumber: 1,
  //       originalClause: 'Original',
  //       revisedClause: 'Revised',
  //       title: 'Clause',
  //       reason: 'Reason',
  //     }],
  //   });

  //   fireEvent.click(screen.getByText(/Revised Document/i));

  //   await waitFor(() => {
  //     expect(spy).toHaveBeenCalledWith(expect.stringContaining('Revised'));
  //   });
  // });

  test('handles empty riskyClauses gracefully', async () => {
    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Some content' }],
      riskyClauses: [],
    });

    fireEvent.click(screen.getByText(/Revised Document/i));
    await waitFor(() => {
      expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
    });
  });

  test('handles clause with no matching page', async () => {
    renderWithStore({
      pagesContent: [{ sectionNumber: 1, content: 'Content' }],
      riskyClauses: [{ sectionNumber: 999 }], // mismatch
    });

    fireEvent.click(screen.getByText(/Revised Document/i));
    await waitFor(() => {
      expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
    });
  });

  // test('renders the edit toggle button with Pencil and Save icons', async () => {
  //   renderWithStore({
  //     pagesContent: [{ sectionNumber: 1, content: 'Original content' }],
  //     riskyClauses: [{ sectionNumber: 1 }],
  //   });

  //   const button = screen.getByTestId('edit-toggle-button');
  //   expect(button).toBeInTheDocument();
  //   fireEvent.click(button); // Click the button to toggle edit mode

  //   const pencilIcon = screen.getByTestId('pencil-icon');
  //   expect(pencilIcon).toBeInTheDocument();

  //   fireEvent.click(button); // Simulate Save action (button click again)
  //   const saveIcon = screen.getByTestId('save-icon');
  //   expect(saveIcon).toBeInTheDocument();
  // });

  test('renders original PDF when showEdited is false', async () => {
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);

    expect(screen.getByTitle("Original PDF")).toBeInTheDocument();
  });

  test('renders no content message when no pages are loaded', async () => {
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);
    
    fireEvent.click(screen.getByText(/Revised Document/i));
    
    await waitFor(() => {
      expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
    });
  });

});
