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
  ) as unknown as jest.MockedFunction<typeof fetch>
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
    ) as jest.Mock

    // Click the "Buat Dokumen" button
    await act(async () => {
      fireEvent.click(screen.getByText("Buat Dokumen"))
    })

    // Wait for the loading message using a flexible text matcher
    await act(async () => {
      await waitFor(() => {
        // Adjusted to check for the loading element by its role or test ID, not text
        expect(screen.getByTestId("loading-message")).toBeInTheDocument()
      })
    })

    // Wait for the generated document to appear with the label or tag, not the text
    await act(async () => {
      await waitFor(() => {
        // Look for the document title or container by its tag or other attributes
        expect(
          screen.getByTestId("document-preview-container")
        ).toBeInTheDocument()
      })
    })
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
})
