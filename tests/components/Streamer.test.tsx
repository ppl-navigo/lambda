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
    const pdfUrl = 'http://example.com/test.pdf';
    render(<Streamer pdfUrl={pdfUrl} />);
    expect(screen.getByText(/Edited PDF/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('displays original PDF when "Original PDF" button is clicked', () => {
    const pdfUrl = 'http://example.com/test.pdf';
    render(<Streamer pdfUrl={pdfUrl} />);
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

  test("updates iframe when new editedPdfUrl is different", async () => {
    const pdfUrl = "http://example.com/test.pdf";
    const editedPdfUrl = "http://example.com/edited-v1.pdf";
  
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { editedPdfUrl },
    });
  
    render(<Streamer pdfUrl={pdfUrl} />);
  
    fireEvent.click(screen.getByText(/Generate Edited PDF/i));
  
    await waitFor(() => {
      const iframe = screen.getByTitle("PDF Viewer");
      expect(iframe).toHaveAttribute("src", editedPdfUrl);
    });
  });
  
  test("does not update state if editedPdfUrl is the same", async () => {
    const pdfUrl = "http://example.com/test.pdf";
    const sameUrl = "http://example.com/test.pdf";
  
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { editedPdfUrl: sameUrl },
    });
  
    render(<Streamer pdfUrl={pdfUrl} />);
  
    fireEvent.click(screen.getByText(/Generate Edited PDF/i));
  
    await waitFor(() => {
      const iframe = screen.getByTitle("PDF Viewer");
      // Still same src, but showEdited should be true
      expect(iframe).toHaveAttribute("src", sameUrl);
      expect(screen.getByText(/Edited PDF/i)).toBeInTheDocument();
    });
  });
  
});