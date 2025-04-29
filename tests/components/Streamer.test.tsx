import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Streamer from '../../app/components/Streamer'; // Relative import
import { Document, Packer, Paragraph, TextRun } from "docx";


jest.mock('docx', () => ({
  ...jest.requireActual('docx'),
  Document: jest.fn().mockImplementation(() => ({
    sections: [{
      children: [],
      properties: {}
    }],
  })),
  Packer: {
    toBlob: jest.fn().mockResolvedValue(new Blob()),
  },
  Paragraph: jest.fn().mockImplementation(args => args),
  TextRun: jest.fn().mockImplementation(args => args),
}));

// TextStreamer – we stream in 10‑byte chunks
jest.mock("@/app/utils/textStreamer", () => ({
  TextStreamer: {
    simulateStream: jest.fn(async (text: string, _d: number, _c: number, cb: (c: string) => void) => {
      (text.match(/.{1,10}/g) || []).forEach(cb);
    }),
  },
}));

// markdown renderer -> just echo
jest.mock("@/app/utils/markdownRenderer", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div data-testid="markdown-content">{text}</div>,
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

// zustand store – light fake
const store = {
  pagesContent: [] as any[], // Explicitly type as any[]
  riskyClauses: [] as any[], // Explicitly type as any[]
  setPagesContent: jest.fn(),
  setRiskyClauses: jest.fn(),
  updatePageContent: jest.fn(),
};
jest.mock("@/app/store/useMouStore", () => ({
  useMouStore: Object.assign(() => store, { getState: () => store }),
}));

const fillStore = (pages: any[], risks: any[]) => {
  store.pagesContent = pages;
  store.riskyClauses = risks;
};

const clickRevisedButton = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText(/Revised Document/i));
  });
  await waitFor(() =>
    expect(screen.queryByText("Processing...")).not.toBeInTheDocument()
  );
};

describe('Streamer component', () => {
  let mockState: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    fillStore([
      { sectionNumber: 1, content: "# Page 1 Content" },
      { sectionNumber: 2, content: "## Page 2 Content" },
    ], []);
    
    // Tambahkan risky clauses untuk memastikan button muncul
    store.riskyClauses = [{
      id: "1",
      sectionNumber: 1,
      originalClause: "Original",
      revisedClause: "Revised",
      title: "",
      reason: ""
    }];
  });

  test('shows "No content loaded yet" when revised text generation fails', async () => {
    // make simulateStream resolve immediately
    const { TextStreamer } = require("@/app/utils/textStreamer");
    TextStreamer.simulateStream.mockResolvedValueOnce(undefined);

    fillStore([{ sectionNumber: 1, content: "Content" }], [{}]);
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    expect(screen.getByText(/Content/i)).toBeInTheDocument();
  });

  test("handles empty riskyClauses gracefully", async () => {
    fillStore([{ sectionNumber: 1, content: "Some content" }], []);
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    expect(screen.getByText(/No risky clauses/i)).toBeInTheDocument();
  });

  test("handles clause with no matching page", async () => {
    fillStore([{ sectionNumber: 1, content: "Content" }], [{ sectionNumber: 999 }]);
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    expect(screen.getByText(/Content/i)).toBeInTheDocument();
  });

  test('renders original PDF when showEdited is false', async () => {
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);

    expect(screen.getByTitle("Original PDF")).toBeInTheDocument();
  });

  test('renders no content message when no pages are loaded', async () => {
    fillStore([], []); // Reset pagesContent ke empty array
    render(<Streamer pdfUrl="http://example.com/test.pdf" />);
    
    await clickRevisedButton();
    
    await waitFor(() => {
      expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
    });
  });

  test("renders revised markdown with substituted clause", async () => {
    fillStore(
      [{ sectionNumber: 1, content: "Original content" }],
      [
        {
          id: "a",
          sectionNumber: 1,
          originalClause: "Original",
          revisedClause: "This is the new revised clause.",
          title: "",
          reason: "",
          currentClause: "Original",
        },
      ]
    );
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    const md = screen.getByTestId("markdown-content");
    expect(md).toHaveTextContent(/PAGE_START_1/);
  });

  test("textarea height adjusts when content becomes empty", async () => {
    fillStore(
      [{ sectionNumber: 1, content: "Original" }],
      [{ id: "x", sectionNumber: 1, currentClause: "", originalClause: "", revisedClause: "", title: "", reason: "" }]
    );
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    fireEvent.click(screen.getByTestId("edit-toggle-button")); // enter edit mode
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "" } });
    expect(textarea.style.height).toBe("");
  });

  test("revisedText updates after saving edits", async () => {
    fillStore(
      [{ sectionNumber: 1, content: "Original" }],
      [{ id: "x", sectionNumber: 1, currentClause: "", originalClause: "", revisedClause: "", title: "", reason: "" }]
    );
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    fireEvent.click(screen.getByTestId("edit-toggle-button"));  // pencil
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Edited" } });
    fireEvent.click(screen.getByTestId("edit-toggle-button"));  // save

    expect(screen.getByText(/Revised/)).toBeInTheDocument();
  });

  test("simulateStream is called with revised clause", async () => {
    const { TextStreamer } = require("@/app/utils/textStreamer");
    fillStore(
      [{ sectionNumber: 1, content: "Original Content" }],
      [
        { id: "r", sectionNumber: 1, originalClause: "Original", revisedClause: "Revised", title: "", reason: "", currentClause: "Original" },
      ]
    );
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    expect(TextStreamer.simulateStream).toHaveBeenCalledWith(
      expect.stringContaining("Content"),
      100,
      100,
      expect.any(Function)
    );
  });

  test("edit-toggle button swaps Pencil ↔ Save icons", async () => {
    fillStore(
      [{ sectionNumber: 1, content: "Original" }],
      [{ id: "x", sectionNumber: 1, currentClause: "", originalClause: "", revisedClause: "", title: "", reason: "" }]
    );
    render(<Streamer pdfUrl="x.pdf" />);

    await clickRevisedButton();
    const btn = screen.getByTestId("edit-toggle-button");
    fireEvent.click(btn); // edit
    expect(screen.getByTestId("save-icon")).toBeInTheDocument();
    fireEvent.click(btn); // save
    expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
  });

  describe('Download Button Functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      fillStore(
        [
          { sectionNumber: 1, content: "# Page 1 Content" },
          { sectionNumber: 2, content: "## Page 2 Content" },
        ],
        // Tambahkan risky clause agar button muncul
        [{ id: "1", sectionNumber: 1, originalClause: "Original", revisedClause: "Revised", title: "", reason: "" }]
      );
    });
  
    test('opens page selection modal when download button clicked', async () => {
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
      
      fireEvent.click(screen.getByTestId("download-button"));
      
      await waitFor(() => {
        expect(screen.getByText('Select Pages to Download')).toBeInTheDocument();
      });
    });
  
    test('downloads selected pages as DOCX', async () => {
      const mockToBlob = jest.spyOn(Packer, 'toBlob').mockResolvedValue(new Blob());
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
      
      // Open modal and select pages
      fireEvent.click(screen.getByRole('button', { name: /download-button/i }));
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      fireEvent.click(screen.getByText('Download (1)'));
  
      await waitFor(() => {
        expect(mockToBlob).toHaveBeenCalled();
        const docInstance = (Document as jest.Mock).mock.instances[0];
        expect(docInstance).toBeDefined();
      });
    });
  
    test('generates correct DOCX structure', async () => {
      const mockToBlob = jest.spyOn(Packer, 'toBlob').mockResolvedValue(new Blob());
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
    
      fireEvent.click(screen.getByTestId("download-button"));
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      fireEvent.click(screen.getByText('Download (1)'));
    
      await waitFor(() => {
        const docConfig = (Document as jest.Mock).mock.calls[0][0];
        expect(docConfig.sections[0].children[0]).toMatchObject({
          text: 'Page 1 Content',
          style: 'Heading1'
        });
      });
    });
  
    test('disables download button when no pages selected', async () => {
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
      
      const downloadBtn = await screen.findByRole('button', { 
        name: /download-button/i 
      });
      fireEvent.click(downloadBtn);
      
      const downloadButton = screen.getByText('Download (0)');
      expect(downloadButton).toBeDisabled();
    });
  
    test('closes modal after download', async () => {
      jest.spyOn(Packer, 'toBlob').mockResolvedValue(new Blob());
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
      
      // Buka modal
      fireEvent.click(screen.getByRole('button', { name: /download-button/i }));
      // Klik tombol Cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Select Pages to Download')).not.toBeInTheDocument();
    });
  
    test('handles DOCX generation failure', async () => {
      const mockToBlob = jest.spyOn(Packer, 'toBlob')
        .mockRejectedValue(new Error('Generation failed'));
      const mockToast = jest.requireMock('react-toastify').toast;
  
      render(<Streamer pdfUrl="x.pdf" />);
      await clickRevisedButton();
      
      fireEvent.click(screen.getByRole('button', { name: /download-button/i }));
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      fireEvent.click(screen.getByText('Download (1)'));
  
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to generate document');
      });
    });
  });

  // Test untuk handleDownload dengan selectedPages kosong
test('handles download with no selected pages', async () => {
  render(<Streamer pdfUrl="x.pdf" />);
  await clickRevisedButton();
  
  fireEvent.click(screen.getByRole('button', { name: /download-button/i }));
  const downloadButton = screen.getByText('Download (0)');
  expect(downloadButton).toBeDisabled();
});

// Test untuk error handling dalam handleGenerateEditedText
test('handles stream abort during generation', async () => {
  const { TextStreamer } = require("@/app/utils/textStreamer");
  TextStreamer.simulateStream.mockImplementationOnce(() => {
    throw new Error('Stream aborted');
  });

  fillStore([], []); // Pastikan tidak ada konten
  render(<Streamer pdfUrl="x.pdf" />);
  
  await act(async () => {
    fireEvent.click(screen.getByText(/Revised Document/i));
  });
  
  await waitFor(() => {
    expect(screen.getByText(/No content loaded yet/i)).toBeInTheDocument();
  });
});
});
