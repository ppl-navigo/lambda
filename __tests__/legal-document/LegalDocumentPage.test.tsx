import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import LegalDocumentsPage from "../../app/legal-document/page"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"
import { act } from "react"

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Generated Content"))
          controller.close()
        },
      }),
    })
  ) as jest.Mock
})
beforeAll(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {}) // Mock alert to prevent crashes
})
beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {}) // Mock alert

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Generated Content"))
          controller.close()
        },
      }),
    })
  ) as jest.Mock
})

describe("LegalDocumentsPage Component", () => {
  it("renders the page with required elements", () => {
    render(<LegalDocumentsPage />)

    // Header title
    expect(screen.getByText("Mulai Membuat Dokumen")).toBeInTheDocument()

    // Dropdown default value
    expect(screen.getByText("Jenis Dokumen Hukum")).toBeInTheDocument()

    // Action buttons
    expect(screen.getByText("Unduh")).toBeInTheDocument()
    expect(screen.getByText("Bagikan")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).toBeDisabled()
  })

  it("allows user to select a document type from dropdown", async () => {
    render(<LegalDocumentsPage />)

    // Klik dropdown menu
    await userEvent.click(screen.getByText("Jenis Dokumen Hukum"))

    // Tunggu hingga menu muncul dengan mencari dalam document.body (untuk menangani Portal)
    await waitFor(() => {
      expect(within(document.body).getByText("MoU")).toBeInTheDocument()
    })

    // Pilih opsi "MoU"
    await userEvent.click(screen.getByText("MoU"))

    // Pastikan teks telah berubah
    await waitFor(() => expect(screen.getByText("MoU")).toBeInTheDocument())
  })
  it("renders and interacts with the 'More Options' dropdown", async () => {
    render(<LegalDocumentsPage />)

    // Klik tombol "More Options" menggunakan userEvent
    await userEvent.click(screen.getByTestId("more-options-button"))

    // Debug DOM jika dropdown tidak muncul
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log(screen.debug()) // Debug untuk melihat apakah "Menu 1" ada

    // Cari dalam document.body jika dropdown menggunakan Portal
    await waitFor(() => {
      expect(within(document.body).getByText("Menu 1")).toBeInTheDocument()
    })

    // Pastikan dropdown memiliki elemen yang benar
    expect(screen.getByText("Menu 1")).toBeInTheDocument()
    expect(screen.getByText("Menu 2")).toBeInTheDocument()
  })

  it("renders the DocumentForm component", () => {
    render(<LegalDocumentsPage />)

    // Periksa apakah input form Judul ada
    expect(
      screen.getByPlaceholderText("MoU ini tentang...")
    ).toBeInTheDocument()
  })

  it("displays the generated document correctly", async () => {
    render(<LegalDocumentsPage />)

    // Setup mock response for this specific test
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Generated Content"))
            controller.close()
          },
        }),
      })
    ) as jest.Mock
    
    // Click the "Buat Dokumen" button
    await act(async () => {
      fireEvent.click(screen.getByText("Buat Dokumen"))
    })

    // Wait for loading message
    await act(async () => {
      await waitFor(() => {
        expect(
          screen.getByText((text) => text.includes("Memulai pembuatan dokumen"))
        ).toBeInTheDocument()
      })
    })

    // Wait for the generated document to appear with the exact mock content
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText("Generated Content")).toBeInTheDocument()
      })
    })

    // Ensure the comment box is enabled
    const commentBox = screen.getByPlaceholderText("Tambahkan komentar revisi...")
    expect(commentBox).not.toBeDisabled()
  }, 15000)

  it("disables comment input and retry button before document is generated", () => {
    render(<LegalDocumentsPage />)

    // Pastikan textarea komentar dinonaktifkan
    expect(
      screen.getByPlaceholderText("Tambahkan komentar revisi...")
    ).toBeDisabled()

    // Pastikan tombol "Coba Buat Ulang" dinonaktifkan
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).toBeDisabled()
  })

  it("enables retry button after generating a document", async () => {
    render(<LegalDocumentsPage />)
    
    // Setup mock response for this specific test
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Generated Content"))
            controller.close()
          },
        }),
      })
    ) as jest.Mock

    // Klik tombol Buat Dokumen
    fireEvent.click(screen.getByText("Buat Dokumen"))

    // Wait for the generated content to appear
    await waitFor(
      () => {
        expect(screen.getByText("Generated Content")).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Ensure "Coba Buat Ulang" button is enabled
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).not.toBeDisabled()
  })

  it("clears the document preview when retry button is clicked", async () => {
    render(<LegalDocumentsPage />)
    
    // Setup mock response for this specific test
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Generated Content"))
            controller.close()
          },
        }),
      })
    ) as jest.Mock

    // Generate document first
    fireEvent.click(screen.getByText("Buat Dokumen"))

    // Wait for document to appear
    await waitFor(
      () => {
        expect(screen.getByText("Generated Content")).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Mock the window.confirm to return true
    window.confirm = jest.fn().mockImplementation(() => true);

    // Click retry button
    fireEvent.click(screen.getByRole("button", { name: /coba buat ulang/i }))

    // Verify document is cleared - check for default state
    // Using waitFor because state changes might be asynchronous
    await waitFor(() => {
      const defaultText = screen.getByText((text) => 
        text.includes("Generated document will show here")
      );
      expect(defaultText).toBeInTheDocument();
    });
  })
})
