import { GET } from "../../app/api/download/route";

describe("Download API", () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("should generate a download URL successfully", async () => {
    // Mock request with valid parameters
    const mockRequest = {};
    const mockParams = { filename: "example.pdf" };

    // Call the API
    const response = await GET(mockRequest as any, { params: mockParams });

    // Assertions
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toBe("https://res.cloudinary.com/test-cloud/raw/upload/example.pdf");
  });

  it("should return an error if filename is missing", async () => {
    // Mock request with missing filename
    const mockRequest = {};
    const mockParams = { filename: "" }; // Empty filename

    // Call the API
    const response = await GET(mockRequest as any, { params: mockParams });

    // Assertions
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Filename is required");
  });

  it("should handle unexpected errors", async () => {
    // Mock request with a special filename to trigger an error
    const mockRequest = {};
    const mockParams = { filename: "throw-error" };

    // Spy on console.error to suppress logs
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Call the API
    const response = await GET(mockRequest as any, { params: mockParams });

    // Assertions
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to generate download URL");

    // Restore mocks
    (console.error as jest.Mock).mockRestore();
  });
});