import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { saveAs } from 'file-saver';
import * as marked from 'marked';
import DocumentHistory from '../../app/generate/history/page';

describe('DocumentHistory Page', () => {
    it('renders the Sidebar and DocumentViewer components', () => {
        render(<DocumentHistory />);

        // Verify the sidebar contain username
        expect(screen.getByText("🔺 Alicia Koch")).toBeInTheDocument();

        // Verify the DocumentViewer fallback message
        expect(screen.getByText(/No document selected/)).toBeInTheDocument();
    });
});

// Mock the external dependencies
jest.mock('file-saver');
jest.mock('marked');
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [
            {
              title: 'Test Document',
              content: '# Test Content',
              created_at: '2025-04-08T03:44:28Z',
              document_type: 'contract'
            }
          ],
          error: null
        }))
      }))
    }))
  }
}));

describe('Document Download Test', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<DocumentHistory />);
    expect(screen.getByTestId('document-preview-container')).toBeInTheDocument();
  });

  it('shows download button when a document is selected', async () => {
    render(<DocumentHistory />);
    
    // Wait for documents to load
    const downloadButton = await screen.findByText('Download Document');
    expect(downloadButton).toBeInTheDocument();
  });

  it('converts markdown to docx and triggers download when button is clicked', async () => {
    // Mock marked.lexer to return some tokens
    (marked.lexer as jest.Mock).mockReturnValue([
      { type: 'heading', text: 'Test Content' },
      { type: 'paragraph', text: 'Test paragraph' }
    ]);

    render(<DocumentHistory />);
    
    // Wait for download button and click it
    const downloadButton = await screen.findByText('Download Document');
    fireEvent.click(downloadButton);

    // Check if saveAs was called
    expect(saveAs).toHaveBeenCalled();
  });
});
