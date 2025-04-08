import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Streamer from '@/app/components/Streamer';
import '@testing-library/jest-dom';

// Mock ReadableStream for Jest
global.ReadableStream = require('web-streams-polyfill').ReadableStream;

// Mock fetch API
global.fetch = jest.fn();

// Mock react-markdown
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock remark-gfm (jika digunakan oleh react-markdown)
jest.mock('remark-gfm', () => jest.fn());

// Mock remark-breaks (jika digunakan oleh react-markdown)
jest.mock('remark-breaks', () => jest.fn());

// Mock lucide-react (jika digunakan untuk ikon)
jest.mock('lucide-react', () => ({
  Pencil: () => <svg data-testid="pencil-icon" />,
  Save: () => <svg data-testid="save-icon" />,
}));

// Mock pdfjs-dist (jika digunakan untuk PDF processing)
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn(() => Promise.resolve({})),
}));

describe('Streamer component', () => {
  const pdfUrl = 'http://example.com/test.pdf';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders an iframe with the correct src when showing original PDF', () => {
    render(<Streamer pdfUrl={pdfUrl} />);
    const iframeElement = screen.getByTitle('Original PDF');
    expect(iframeElement).toHaveAttribute('src', pdfUrl);
  });

  test('fetches and displays revised text when "Generate Revised Text" button is clicked', async () => {
    const mockResponse = {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Revised text chunk'));
          controller.close();
        },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<Streamer pdfUrl={pdfUrl} />);

    // Click "Generate Revised Text" button
    fireEvent.click(screen.getByText(/Generate Revised Text/i));

    // Wait for loading state to finish
    await waitFor(() => expect(screen.queryByText(/Processing.../i)).not.toBeInTheDocument());

    // Check if revised text is displayed
    expect(screen.getByText(/Revised text chunk/i)).toBeInTheDocument();
  });

  test('enables editing mode and updates revised text', async () => {
    const mockResponse = {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Initial revised text'));
          controller.close();
        },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<Streamer pdfUrl={pdfUrl} />);

    // Generate revised text
    fireEvent.click(screen.getByText(/Generate Revised Text/i));
    await waitFor(() => expect(screen.queryByText(/Processing.../i)).not.toBeInTheDocument());

    // Enable editing mode
    fireEvent.click(screen.getByTestId('pencil-icon')); // Pencil icon
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();

    // Update revised text
    fireEvent.change(textarea, { target: { value: 'Updated revised text' } });
    expect(textarea).toHaveValue('Updated revised text');

    // Save changes
    fireEvent.click(screen.getByTestId('save-icon')); // Save icon
    expect(screen.getByText(/Updated revised text/i)).toBeInTheDocument();
  });
});