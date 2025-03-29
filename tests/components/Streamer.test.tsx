import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Streamer from '@/app/components/Streamer';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Streamer component', () => {
  test('renders an iframe with the correct src and title when pdfUrl is provided', () => {
    const pdfUrl = 'http://example.com/test.pdf';
    render(<Streamer pdfUrl={pdfUrl} />);
    const iframeElement = screen.getByTitle('PDF Viewer');
    expect(iframeElement).toHaveAttribute('src', pdfUrl);
  });

  test('does not make an API call if editedPdfUrl is already set', async () => {
    const editedPdfUrl = 'http://example.com/edited.pdf';
    const pdfUrl = 'http://example.com/test.pdf';
    render(<Streamer pdfUrl={pdfUrl} editedPdfUrl={editedPdfUrl} />);
    expect(screen.getByText(/Edited PDF/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('displays original PDF when "Original PDF" button is clicked', () => {
    const pdfUrl = 'http://example.com/test.pdf';
    const editedPdfUrl = 'http://example.com/edited.pdf';
    render(<Streamer pdfUrl={pdfUrl} editedPdfUrl={editedPdfUrl} />);
    fireEvent.click(screen.getByText(/Original PDF/i));
    const iframeElement = screen.getByTitle('PDF Viewer');
    expect(iframeElement).toHaveAttribute('src', pdfUrl);
  });

  test('handles error and does not change the iframe src on failure', async () => {
    const pdfUrl = 'http://example.com/test.pdf';
    const errorMessage = 'API error';
    mockedAxios.post.mockRejectedValue(new Error(errorMessage));

    render(<Streamer pdfUrl={pdfUrl} />);

    fireEvent.click(screen.getByText(/Generate Edited PDF/i));

    await waitFor(() => expect(screen.getByText(/Processing.../i)).toBeInTheDocument());

    const iframeElement = screen.getByTitle('PDF Viewer');
    expect(iframeElement).toHaveAttribute('src', pdfUrl);
  });
});