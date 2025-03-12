import { render, screen, fireEvent } from "@testing-library/react"
import DocumentForm from "../../../app/components/Form/DocumentForm"
import "@testing-library/jest-dom"

describe("DocumentForm Component", () => {
  it("renders the form fields correctly", () => {
    render(<DocumentForm onGenerate={jest.fn()} />)

    expect(screen.getByLabelText("Judul")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("MoU ini tentang...")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Tujuan")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Kenapa Anda membuat MoU ini?")
    ).toBeInTheDocument()
    expect(screen.getByText("Durasi Kerja Sama")).toBeInTheDocument()
    expect(screen.getByText("Tanggal Mulai")).toBeInTheDocument()
    expect(screen.getByText("Tanggal Selesai")).toBeInTheDocument()
    expect(screen.getByText("Pihak-Pihak")).toBeInTheDocument()
    expect(screen.getByText("Pihak 1")).toBeInTheDocument()
    expect(screen.getByText("Pihak 2")).toBeInTheDocument()
  })

  it("allows users to enter a title and objective", () => {
    render(<DocumentForm onGenerate={jest.fn()} />)

    const titleInput = screen.getByPlaceholderText("MoU ini tentang...")
    fireEvent.change(titleInput, { target: { value: "MoU Kerjasama IT" } })
    expect(titleInput).toHaveValue("MoU Kerjasama IT")

    const objectiveInput = screen.getByPlaceholderText(
      "Kenapa Anda membuat MoU ini?"
    )
    fireEvent.change(objectiveInput, {
      target: { value: "Untuk mengembangkan teknologi AI" },
    })
    expect(objectiveInput).toHaveValue("Untuk mengembangkan teknologi AI")
  })

  it("adds a new party when 'Tambahkan Pihak' is clicked", () => {
    render(<DocumentForm onGenerate={jest.fn()} />)

    const addPartyButton = screen.getByText("Tambahkan Pihak")
    fireEvent.click(addPartyButton)

    expect(screen.getByPlaceholderText("Pihak 3")).toBeInTheDocument()
  })

  it("removes the last party when 'Hapus Pihak' is clicked", () => {
    render(<DocumentForm onGenerate={jest.fn()} />)

    const addPartyButton = screen.getByText("Tambahkan Pihak")
    fireEvent.click(addPartyButton) // Adds Pihak 3
    expect(screen.getByPlaceholderText("Pihak 3")).toBeInTheDocument()

    const removePartyButton = screen.getByText("Hapus Pihak")
    fireEvent.click(removePartyButton)

    expect(screen.queryByPlaceholderText("Pihak 3")).not.toBeInTheDocument()
  })

  it("calls the onGenerate function when 'Hasilkan Dokumen' is clicked", () => {
    const mockOnGenerate = jest.fn()
    render(<DocumentForm onGenerate={mockOnGenerate} />)

    const generateButton = screen.getByText("Hasilkan Dokumen")
    fireEvent.click(generateButton)

    expect(mockOnGenerate).toHaveBeenCalled()
  })

  it("disables selecting end date before start date", async () => {
    render(<DocumentForm onGenerate={jest.fn()} />)

    const startDateButton = screen.getByText("Tanggal Mulai")
    fireEvent.click(startDateButton)
    fireEvent.click(screen.getByText("15")) // Select March 15

    const endDateButton = screen.getByText("Tanggal Selesai")
    fireEvent.click(endDateButton)
    fireEvent.click(screen.getByText("10")) // Attempt to select March 10

    await screen.findByText(
      "Tanggal selesai tidak boleh sebelum tanggal mulai."
    )
  })
})
