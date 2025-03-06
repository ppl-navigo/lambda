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

    // Klik tombol Buat Dokumen (updated from Hasilkan Dokumen)
    fireEvent.click(screen.getByText("Buat Dokumen"))

    // Pastikan ada loading text sebelum dokumen muncul
    expect(
      await screen.findByText("⏳ Generating document...")
    ).toBeInTheDocument()

    // Tunggu hasil dokumen muncul setelah simulasi 3 detik
    await waitFor(
      () => {
        expect(
          screen.getByText((content) =>
            content.includes(
              "📜 Your generated document content will appear here"
            )
          )
        ).toBeInTheDocument()
      },
      { timeout: 5000 }
    ) // Tambah timeout agar cukup waktu menunggu

    // Pastikan textarea bisa diketik setelah dokumen dibuat
    const commentBox = screen.getByPlaceholderText(
      "Tambahkan komentar revisi..."
    )
    expect(commentBox).not.toBeDisabled()
  })

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

    // Klik tombol Buat Dokumen (updated from Hasilkan Dokumen)
    fireEvent.click(screen.getByText("Buat Dokumen"))

    // Tunggu hingga teks muncul (gunakan fungsi matcher)
    await waitFor(
      () => {
        expect(
          screen.getByText((content) =>
            content.includes("Your generated document content")
          )
        ).toBeInTheDocument()
      },
      { timeout: 5000 }
    ) // Tambah timeout agar cukup waktu menunggu

    // Pastikan tombol "Coba Buat Ulang" aktif
    expect(
      screen.getByRole("button", { name: /coba buat ulang/i })
    ).not.toBeDisabled()
  })

  it("clears the document preview when retry button is clicked", async () => {
    render(<LegalDocumentsPage />)

    // Klik tombol Buat Dokumen (updated from Hasilkan Dokumen)
    fireEvent.click(screen.getByText("Buat Dokumen"))

    // Tunggu dokumen muncul
    await waitFor(
      () => {
        expect(
          screen.getByText((content) =>
            content.includes("Your generated document content")
          )
        ).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Klik tombol "Coba Buat Ulang"
    fireEvent.click(screen.getByRole("button", { name: /coba buat ulang/i }))

    // Tunggu hingga teks berubah menjadi default
    await waitFor(() => {
      expect(screen.getByText("⏳ Generating document...")).toBeInTheDocument()
    })
  })
})
