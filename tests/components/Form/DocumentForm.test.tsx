import { render, screen, fireEvent } from "@testing-library/react";
import DocumentForm from "../../../app/components/Form/DocumentForm";
import "@testing-library/jest-dom";

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
});
