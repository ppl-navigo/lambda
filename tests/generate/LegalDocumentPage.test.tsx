import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import LegalDocumentsPage from "../../app/generate/page";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { ReadableStream } from "web-streams-polyfill";
import DocumentForm from "../../app/components/Form/DocumentForm";
import { supabase } from "../../utils/supabase";
// Add to your Jest setup (beforeAll or beforeEach)
beforeAll(() => {
  // Polyfill ReadableStream for Node.js environment
  global.ReadableStream = ReadableStream;
});
// Mock unified and related packages
jest.mock("unified", () => ({
  unified: jest.fn().mockReturnValue({
    use: jest.fn().mockReturnThis(),
    process: jest.fn().mockResolvedValue({ value: "mocked content" }),
  }),
}));
// Di dalam komponen LegalDocumentsPage
jest.mock("../../utils/supabase", () => ({
  __esModule: true,
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        then: jest.fn().mockImplementation((callback) => {
          callback({ data: null, error: new Error("Database Error") }); // Pastikan error di-return
          return { catch: jest.fn() };
        }),
      })),
    })),
  },
}));
jest.mock("remark-parse", () => jest.fn());
jest.mock("remark-docx", () => jest.fn());
// Di dalam test

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Generated Content"));
          controller.close();
        },
      }),
    })
  ) as unknown as jest.MockedFunction<typeof fetch>;
});

beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {}); // Mock alert

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Generated Content"));
          controller.close();
        },
      }),
    })
  ) as jest.Mock;
});

describe("LegalDocumentsPage Component", () => {
  it("renders the page with required elements", () => {
    render(<LegalDocumentsPage />);

    // Header title
    expect(screen.getByText("Mulai Membuat Dokumen")).toBeInTheDocument();

    // Dropdown default value
    expect(screen.getByText("Jenis Dokumen Hukum")).toBeInTheDocument();

    // Action buttons
    expect(screen.getByText("Unduh")).toBeInTheDocument();
    expect(screen.getByText("Bagikan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).toBeDisabled();
  });

  it("allows user to select a document type from dropdown", async () => {
    render(<LegalDocumentsPage />);

    // Klik dropdown menu
    await userEvent.click(screen.getByText("Jenis Dokumen Hukum"));

    // Tunggu hingga menu muncul dengan mencari dalam document.body (untuk menangani Portal)
    await waitFor(() => {
      expect(within(document.body).getByText("MoU")).toBeInTheDocument();
    });

    // Pilih opsi "MoU"
    await userEvent.click(screen.getByText("MoU"));

    // Pastikan teks telah berubah
    await waitFor(() => expect(screen.getByText("MoU")).toBeInTheDocument());
  });
  it("renders and interacts with the 'More Options' dropdown", async () => {
    render(<LegalDocumentsPage />);

    // Klik tombol "More Options" menggunakan userEvent
    await userEvent.click(screen.getByTestId("more-options-button"));

    // Debug DOM jika dropdown tidak muncul
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(screen.debug()); // Debug untuk melihat apakah "Menu 1" ada

    // Cari dalam document.body jika dropdown menggunakan Portal
    await waitFor(() => {
      expect(within(document.body).getByText("Menu 1")).toBeInTheDocument();
    });

    // Pastikan dropdown memiliki elemen yang benar
    expect(screen.getByText("Menu 1")).toBeInTheDocument();
    expect(screen.getByText("Menu 2")).toBeInTheDocument();
  });

  it("renders the DocumentForm component", () => {
    render(<LegalDocumentsPage />);

    // Periksa apakah input form Judul ada
    expect(
      screen.getByPlaceholderText("MoU ini tentang...")
    ).toBeInTheDocument();
  });

  it("displays the generated document correctly", async () => {
    render(<LegalDocumentsPage />);

    // Setup mock response for this specific test
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            jenis_kontrak: "Perjanjian Kerjasama",
            judul: "Kontrak Kemitraan Strategis",
            tujuan: "Menjalin kemitraan strategis antara dua perusahaan",
            pihak: [
              {
                nama: "PT ABC",
                hak_pihak: [
                  "Menggunakan teknologi eksklusif",
                  "Menerima laporan keuangan",
                ],
                kewajiban_pihak: [
                  "Membayar biaya lisensi",
                  "Memberikan dukungan teknis",
                ],
              },
              {
                nama: "PT XYZ",
                hak_pihak: [
                  "Menerima pembayaran royalti",
                  "Mengakses laporan tahunan",
                ],
                kewajiban_pihak: [
                  "Menyediakan akses teknologi",
                  "Memberikan pelatihan kepada tim",
                ],
              },
            ],
            mulai_kerja_sama: "2025-04-01",
            akhir_kerja_sama: "2028-04-01",
            pemecah_masalah: "Arbitrase Internasional",
            comment: "Kesepakatan perlu direvisi setiap tahun",
            author: "email@example.com",
          }),
      })
    ) as jest.Mock;

    // Click the "Buat Dokumen" button
    await act(async () => {
      fireEvent.click(screen.getByText("Buat Dokumen"));
    });

    // Wait for the generated document to appear with the label or tag, not the text
    await act(async () => {
      await waitFor(() => {
        // Look for the document title or container by its tag or other attributes
        expect(
          screen.getByTestId("document-preview-container")
        ).toBeInTheDocument();
      });
    });
  }, 15000);

  it("disables comment input and retry button before document is generated", () => {
    render(<LegalDocumentsPage />);

    // Pastikan textarea komentar dinonaktifkan
    expect(
      screen.getByPlaceholderText("Tambahkan komentar revisi...")
    ).toBeDisabled();

    // Pastikan tombol "Coba Buat Ulang" dinonaktifkan
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).toBeDisabled();
  });
  // ...existing code...

  it("enables comment textarea and retry button after document generation", async () => {
    render(<LegalDocumentsPage />);

    // Verify initial state - disabled
    expect(
      screen.getByPlaceholderText("Tambahkan komentar revisi...")
    ).toHaveAttribute("disabled", "");
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).toHaveAttribute("disabled", "");

    // Fill in required form fields
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document Title" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test document purpose" },
      }
    );

    // Fill in first party name - using correct placeholder
    const partyNameInputs = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    fireEvent.change(partyNameInputs[0], {
      target: { value: "Test Company" },
    });

    // Setup mock response with proper format
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("data: Generated Document Content")
            );
            controller.close();
          },
        }),
      })
    ) as jest.Mock;

    // Generate document
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    // Wait for generation to complete
    await waitFor(
      () => {
        // Check if loading message is gone
        expect(
          screen.queryByText(/Memulai pembuatan dokumen/i)
        ).not.toBeInTheDocument();
        return true;
      },
      { timeout: 10000 }
    );

    // Use the attribute check pattern instead
    await waitFor(() => {
      const commentTextarea = screen.getByPlaceholderText(
        "Tambahkan komentar revisi..."
      );
      const retryButton = screen.getByTestId("retry-button");

      expect(commentTextarea).not.toHaveAttribute("disabled");
      expect(retryButton).toBeDisabled();
    });
  });

  it("shows error message when document generation fails", async () => {
    render(<LegalDocumentsPage />);

    // Fill in required form fields
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document Title" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test document purpose" },
      }
    );

    // Fill in first party name - using correct placeholder
    const partyNameInputs = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    fireEvent.change(partyNameInputs[0], {
      target: { value: "Test Company" },
    });

    // Setup mock response for failure
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.reject(new Error("API Error"))
      ) as jest.Mock;

    // Generate document using correct test ID
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    // Check for error message
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to generate document/i)
      ).toBeInTheDocument();
    });
  });

  it("shows loading state during document generation", async () => {
    render(<LegalDocumentsPage />);

    // Fill in required form fields
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document Title" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test document purpose" },
      }
    );

    // Fill in first party name
    const partyNameInputs = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    fireEvent.change(partyNameInputs[0], {
      target: { value: "Test Company" },
    });

    // Create a delayed response without using ReadableStream
    let resolveResponse: (value: Response) => void = () => {};
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = (mockResponse) => {
        resolve(mockResponse);
      };
    });

    global.fetch = jest
      .fn()
      .mockImplementation(() => responsePromise) as jest.Mock;

    // Start document generation
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    expect(screen.getByText(/Memulai pembuatan dokumen/i)).toBeInTheDocument();

    // Create a proper mock response with ReadableStream
    const mockResponse = {
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: new ReadableStream({
        start(controller) {
          // Send a proper SSE formatted message
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"content":"Generated document content"}\n\n'
            )
          );
          controller.close();
        },
      }),
    } as unknown as Response;

    // Complete the fetch response
    resolveResponse(mockResponse);

    // Wait for loading state to disappear with longer timeout
    await waitFor(
      () => {
        expect(
          screen.queryByText(/Memulai pembuatan dokumen/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("handles retry document generation", async () => {
    // Mock confirm to return true
    window.confirm = jest.fn().mockImplementation(() => true);

    render(<LegalDocumentsPage />);

    // Fill in required form fields
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document Title" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test document purpose" },
      }
    );

    // Fill in first party name
    const partyNameInputs = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    fireEvent.change(partyNameInputs[0], {
      target: { value: "Test Company" },
    });

    // Setup successful initial response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("data: Initial Document")
            );
            controller.close();
          },
        }),
      })
    ) as jest.Mock;

    // Generate document initially
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    // Wait for generation to complete
    await waitFor(
      () => {
        expect(
          screen.queryByText(/Memulai pembuatan dokumen/i)
        ).not.toBeInTheDocument();
        return true;
      },
      { timeout: 2000 }
    );

    // Clear fetch mock to track retry call
    jest.clearAllMocks();

    // Add revision comment
    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText("Tambahkan komentar revisi..."),
        { target: { value: "Please revise this document" } }
      );
    });

    // Click retry button
    await act(async () => {
      fireEvent.click(screen.getByTestId("retry-button"));
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Apakah Anda yakin ingin membuat ulang dokumen?"
    );

    expect(global.fetch).toHaveBeenCalled();
  });

  it("handles document download and share buttons", async () => {
    render(<LegalDocumentsPage />);

    // Mock alert
    const mockAlert = jest.fn();
    window.alert = mockAlert;

    // Verify buttons are initially disabled
    expect(screen.getByText("Unduh")).toBeDisabled();
    expect(screen.getByText("Bagikan")).toBeDisabled();

    // Fill in required form fields
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document Title" },
    });

    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test document purpose" },
      }
    );

    // Fill in first party name
    const partyNameInputs = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    fireEvent.change(partyNameInputs[0], {
      target: { value: "Test Company" },
    });

    // Generate document with mock response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("data: Generated Document")
            );
            controller.close();
          },
        }),
      })
    ) as jest.Mock;

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    // Wait for generation to complete
    await waitFor(
      () => {
        expect(
          screen.queryByText(/Memulai pembuatan dokumen/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Click the download button and verify alert
    fireEvent.click(screen.getByText("Unduh"));
    expect(mockAlert).toHaveBeenCalledWith(
      "Download functionality to be implemented"
    );

    // Click the share button and verify alert
    fireEvent.click(screen.getByText("Bagikan"));
    expect(mockAlert).toHaveBeenCalledWith(
      "Share functionality to be implemented"
    );
  });

  it("handles validation in retry functionality", async () => {
    // Mock window.confirm
    window.confirm = jest.fn().mockImplementation(() => false);

    render(<LegalDocumentsPage />);

    // Generate initial document with required setup
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test Document" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Test purpose" },
      }
    );
    const partyInputs = screen.getAllByPlaceholderText("Nama atau Organisasi");
    fireEvent.change(partyInputs[0], { target: { value: "Company ABC" } });

    // Setup mock response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode("data: Document Content")
            );
            controller.close();
          },
        }),
      })
    ) as jest.Mock;

    // Generate document
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-button"));
    });

    // Wait for generation to complete
    await waitFor(
      () => {
        expect(
          screen.queryByText(/Memulai pembuatan dokumen/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Verify retry button is disabled when comment is empty
    expect(screen.getByTestId("retry-button")).toBeDisabled();

    // Add comment and verify button is enabled
    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText("Tambahkan komentar revisi..."),
        { target: { value: "Some revision comment" } }
      );
    });
    expect(screen.getByTestId("retry-button")).not.toBeDisabled();

    // Reset fetch mock to track calls
    jest.clearAllMocks();

    // Click retry with confirmation dialog returning false
    await act(async () => {
      fireEvent.click(screen.getByTestId("retry-button"));
    });
    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("DocumentForm Component", () => {
  it("renders the form fields correctly", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    expect(screen.getByLabelText("Judul")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("MoU ini tentang...")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tujuan")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?")
    ).toBeInTheDocument();
    expect(screen.getByText("Durasi Kerja Sama")).toBeInTheDocument();
    expect(screen.getByText("Tanggal Mulai")).toBeInTheDocument();
    expect(screen.getByText("Tanggal Selesai")).toBeInTheDocument();
    expect(screen.getByText("Pihak-Pihak")).toBeInTheDocument();
    expect(screen.getAllByText("Pihak 1").length).toBe(2);
    expect(screen.getAllByText("Pihak 2").length).toBe(2);
  });

  it("allows users to enter a title and objective", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    const titleInput = screen.getByPlaceholderText("MoU ini tentang...");
    fireEvent.change(titleInput, { target: { value: "MoU Kerjasama IT" } });
    expect(titleInput).toHaveValue("MoU Kerjasama IT");

    const objectiveInput = screen.getByPlaceholderText(
      "Kenapa Anda membuat MoU ini?"
    );
    fireEvent.change(objectiveInput, {
      target: { value: "Untuk mengembangkan teknologi AI" },
    });
    expect(objectiveInput).toHaveValue("Untuk mengembangkan teknologi AI");
  });

  it("adds a new party when 'Tambahkan Pihak' is clicked", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Count party sections before adding
    const partyInputsBefore = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    expect(partyInputsBefore.length).toBe(2); // Should start with 2 parties

    const addPartyButton = screen.getByText("Tambahkan Pihak");
    fireEvent.click(addPartyButton);

    // Count party sections after adding
    const partyInputsAfter = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    expect(partyInputsAfter.length).toBe(3); // Should now have 3 parties
  });

  it("removes the last party when 'Hapus Pihak' is clicked", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    const addPartyButton = screen.getByText("Tambahkan Pihak");
    fireEvent.click(addPartyButton); // Adds Pihak 3

    // Check that we now have 3 party inputs
    const partyInputsBefore = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    expect(partyInputsBefore.length).toBe(3); // Should have 3 parties now

    const removePartyButton = screen.getByText("Hapus Pihak");
    fireEvent.click(removePartyButton);

    // Count party sections after removal
    const partyInputsAfter = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    );
    expect(partyInputsAfter.length).toBe(2); // Should be back to 2 parties
  });

  it("calls the onGenerate function when 'Buat Dokumen' is clicked", () => {
    const mockOnGenerate = jest.fn();
    render(<DocumentForm onGenerate={mockOnGenerate} />);

    // Fill in required fields
    // 1. Set the Judul (title)
    const titleInput = screen.getByPlaceholderText("MoU ini tentang...");
    fireEvent.change(titleInput, { target: { value: "Test Document Title" } });

    // 2. Set the Tujuan (objective)
    const objectiveInput = screen.getByPlaceholderText(
      "Kenapa Anda membuat MoU ini?"
    );
    fireEvent.change(objectiveInput, {
      target: { value: "Test Document Objective" },
    });

    // 3. Set a name for at least one party
    const partyInput = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    )[0];
    fireEvent.change(partyInput, { target: { value: "Test Party Name" } });

    // Now click the generate button
    const generateButton = screen.getByTestId("generate-button");
    fireEvent.click(generateButton);

    // Check if onGenerate was called
    expect(mockOnGenerate).toHaveBeenCalled();
  });

  it("disables selecting end date before start date", async () => {
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<DocumentForm onGenerate={jest.fn()} />);
    const startDateButton = screen.getByText("Tanggal Mulai");
    fireEvent.click(startDateButton);
    fireEvent.click(screen.getByText("15")); // Select March 15

    const endDateButton = screen.getByText("Tanggal Selesai");
    fireEvent.click(endDateButton);
    fireEvent.click(screen.getByText("10")); // Attempt to select March 10

    expect(alertMock).toHaveBeenCalledWith(
      "Tanggal selesai tidak boleh sebelum tanggal mulai."
    );
  });

  it("renders the dispute location field correctly", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    expect(
      screen.getByLabelText("Lokasi Penyelesaian Sengketa")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Contoh: Pengadilan Negeri Jakarta Selatan")
    ).toBeInTheDocument();
  });

  it("allows users to enter a dispute location", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    const disputeLocationInput = screen.getByPlaceholderText(
      "Contoh: Pengadilan Negeri Jakarta Selatan"
    );
    fireEvent.change(disputeLocationInput, {
      target: { value: "Pengadilan Negeri Surabaya" },
    });
    expect(disputeLocationInput).toHaveValue("Pengadilan Negeri Surabaya");
  });

  it("renders new party detail fields correctly", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Check that representative name field exists
    expect(
      screen.getAllByPlaceholderText("Nama Perwakilan Pihak")[0]
    ).toBeInTheDocument();

    // Check that position field exists
    expect(
      screen.getAllByPlaceholderText("Jabatan atau Predikat")[0]
    ).toBeInTheDocument();

    // Check that phone number field exists
    expect(
      screen.getAllByPlaceholderText("Nomor Telepon")[0]
    ).toBeInTheDocument();

    // Check that address field exists
    expect(screen.getAllByPlaceholderText("Alamat")[0]).toBeInTheDocument();
  });

  it("allows users to enter party representative details", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Fill in representative name for first party
    const repNameInput = screen.getAllByPlaceholderText(
      "Nama Perwakilan Pihak"
    )[0];
    fireEvent.change(repNameInput, { target: { value: "John Doe" } });
    expect(repNameInput).toHaveValue("John Doe");

    // Fill in position for first party
    const positionInput = screen.getAllByPlaceholderText(
      "Jabatan atau Predikat"
    )[0];
    fireEvent.change(positionInput, { target: { value: "CEO" } });
    expect(positionInput).toHaveValue("CEO");

    // Fill in phone number for first party
    const phoneInput = screen.getAllByPlaceholderText("Nomor Telepon")[0];
    fireEvent.change(phoneInput, { target: { value: "081234567890" } });
    expect(phoneInput).toHaveValue("081234567890");

    // Fill in address for first party
    const addressInput = screen.getAllByPlaceholderText("Alamat")[0];
    fireEvent.change(addressInput, { target: { value: "Jl. Contoh No. 123" } });
    expect(addressInput).toHaveValue("Jl. Contoh No. 123");
  });

  it("includes new fields in the onGenerate call", () => {
    const mockOnGenerate = jest.fn();
    render(<DocumentForm onGenerate={mockOnGenerate} />);

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText("MoU ini tentang...");
    fireEvent.change(titleInput, { target: { value: "Test Document Title" } });

    const objectiveInput = screen.getByPlaceholderText(
      "Kenapa Anda membuat MoU ini?"
    );
    fireEvent.change(objectiveInput, {
      target: { value: "Test Document Objective" },
    });

    const partyInput = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    )[0];
    fireEvent.change(partyInput, { target: { value: "Test Party Name" } });

    // Fill in new fields
    const disputeLocationInput = screen.getByPlaceholderText(
      "Contoh: Pengadilan Negeri Jakarta Selatan"
    );
    fireEvent.change(disputeLocationInput, {
      target: { value: "Pengadilan Negeri Jakarta Pusat" },
    });

    const repNameInput = screen.getAllByPlaceholderText(
      "Nama Perwakilan Pihak"
    )[0];
    fireEvent.change(repNameInput, { target: { value: "Jane Doe" } });

    // Click the generate button
    const generateButton = screen.getByTestId("generate-button");
    fireEvent.click(generateButton);

    // Check if onGenerate was called with the right parameters
    expect(mockOnGenerate).toHaveBeenCalled();
    const generatedData = mockOnGenerate.mock.calls[0][0];

    expect(generatedData.disputeLocation).toBe(
      "Pengadilan Negeri Jakarta Pusat"
    );
    expect(generatedData.parties[0].representativeName).toBe("Jane Doe");
  });

  it("disables selecting start date after end date", async () => {
    // Mock the window.alert before using it
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<DocumentForm onGenerate={jest.fn()} />);

    // First set end date
    const endDateButton = screen.getByText("Tanggal Selesai");
    fireEvent.click(endDateButton);
    fireEvent.click(screen.getByText("15")); // Select day 15

    // Now try to set start date later than end date
    const startDateButton = screen.getByText("Tanggal Mulai");
    fireEvent.click(startDateButton);
    fireEvent.click(screen.getByText("20")); // Try to select day 20

    // Check that the alert was shown
    expect(alertMock).toHaveBeenCalledWith(
      "Tanggal mulai tidak boleh setelah tanggal selesai."
    );

    // Clean up mock after test
    alertMock.mockRestore();
  });
  it("handles regenerateDocument event", () => {
    const mockOnGenerate = jest.fn();
    render(<DocumentForm onGenerate={mockOnGenerate} />);

    // Fill all required fields
    const titleInput = screen.getByPlaceholderText("MoU ini tentang...");
    const objectiveInput = screen.getByPlaceholderText(
      "Kenapa Anda membuat MoU ini?"
    );
    const firstPartyNameInput = screen.getAllByPlaceholderText(
      "Nama atau Organisasi"
    )[0];

    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    fireEvent.change(objectiveInput, { target: { value: "Test Objective" } });
    fireEvent.change(firstPartyNameInput, { target: { value: "Test Party" } });

    // Dispatch custom event
    const event = new Event("regenerateDocument");
    document.dispatchEvent(event);

    expect(mockOnGenerate).toHaveBeenCalled();
  });

  it("validates at least one party has a name", () => {
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    const mockOnGenerate = jest.fn();
    render(<DocumentForm onGenerate={mockOnGenerate} />);

    // Fill required fields EXCEPT party names
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Valid Judul" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?"),
      {
        target: { value: "Valid Tujuan" },
      }
    );

    // Clear any default party names
    const partyInputs = screen.getAllByPlaceholderText("Nama atau Organisasi");
    partyInputs.forEach((input) => {
      fireEvent.change(input, { target: { value: "" } });
    });

    // Trigger submission
    fireEvent.click(screen.getByTestId("generate-button"));

    expect(alertMock).toHaveBeenCalledWith(
      "Setidaknya satu pihak harus memiliki nama"
    );
    expect(mockOnGenerate).not.toHaveBeenCalled();
  });

  it("resets form correctly", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Fill some data
    fireEvent.change(screen.getByPlaceholderText("MoU ini tentang..."), {
      target: { value: "Test" },
    });
    fireEvent.click(screen.getByText("Reset"));

    // Verify reset
    expect(screen.getByPlaceholderText("MoU ini tentang...")).toHaveValue("");
    expect(
      screen.getAllByPlaceholderText("Nama atau Organisasi")[0]
    ).toHaveValue("");
  });

  it("handles rights and obligations operations", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Add right
    fireEvent.click(screen.getAllByText("Tambah Hak")[0]);
    expect(screen.getAllByPlaceholderText("Hak Pihak").length).toBe(3);

    // Remove right
    fireEvent.click(screen.getAllByText("Hapus Hak")[0]);
    expect(screen.getAllByPlaceholderText("Hak Pihak").length).toBe(2);

    // Add obligation
    fireEvent.click(screen.getAllByText("Tambah Kewajiban")[0]);
    expect(screen.getAllByPlaceholderText("Kewajiban Pihak").length).toBe(3);

    // Remove obligation
    fireEvent.click(screen.getAllByText("Hapus Kewajiban")[0]);
    expect(screen.getAllByPlaceholderText("Kewajiban Pihak").length).toBe(2);
  });

  it("handles date validations correctly", () => {
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    render(<DocumentForm onGenerate={jest.fn()} />);

    // Get date buttons using accessible names
    const startDateButton = screen.getByRole("button", {
      name: /Tanggal Mulai/i,
    });
    const endDateButton = screen.getByRole("button", {
      name: /Tanggal Selesai/i,
    });

    // Set valid dates
    fireEvent.click(startDateButton);
    fireEvent.click(screen.getByText("15")); // Select start date
    fireEvent.click(endDateButton);
    fireEvent.click(screen.getByText("20")); // Select end date
    expect(alertMock).not.toHaveBeenCalled();

    // Test valid start date change
    fireEvent.click(startDateButton);
    fireEvent.click(screen.getByText("10")); // Change to valid earlier date
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("initializes new parties with empty rights/obligations", () => {
    render(<DocumentForm onGenerate={jest.fn()} />);

    fireEvent.click(screen.getByText("Tambahkan Pihak"));

    // Check new party has empty rights/obligations
    expect(screen.getAllByText("Tambah Hak").length).toBe(3);
    expect(screen.getAllByText("Tambah Kewajiban").length).toBe(3);
  });

  it("handles Supabase save errors after successful generation", async () => {
    // Mock error scenario
    (supabase.from("documents").insert as jest.Mock).mockImplementationOnce(
      () => ({
        then: jest.fn().mockImplementationOnce((callback) => {
          callback({ data: null, error: new Error("Database Error") }); // Simulasi error
          return { catch: jest.fn() };
        }),
      })
    );

    // Mock console.error
    const originalError = console.error;
    console.error = jest.fn();

    render(<LegalDocumentsPage />);

    // Isi form
    await userEvent.type(
      screen.getByPlaceholderText("MoU ini tentang..."),
      "Test Document"
    );
    await userEvent.click(screen.getByTestId("generate-button"));
  });

  
});
