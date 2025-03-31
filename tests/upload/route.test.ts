import { FormData, File } from "formdata-node";
import { POST } from "../../app/api/upload/route";
import cloudinary from "cloudinary";

// Mock console.error to suppress error logs during tests
const consoleErrorMock = jest.spyOn(console, "error");
beforeEach(() => {
  consoleErrorMock.mockClear(); // Clear mock before each test
});
afterAll(() => {
  consoleErrorMock.mockRestore(); // Restore original console.error after all tests
});

// Mock Cloudinary
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

describe("Upload API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET = "test-api-secret";
  });

  it("should upload a file successfully and return the secure URL", async () => {
    // Mock a file in memory
    const fileContent = Buffer.from("This is a test PDF file content.", "utf-8");
    const file = new File([fileContent], "example.pdf", {
      type: "application/pdf",
    });

    // Mock arrayBuffer() method
    file.arrayBuffer = jest.fn().mockResolvedValue(fileContent);

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    // Mock request
    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    };

    // Mock Cloudinary response
    const mockCloudinaryResult = {
      secure_url: "https://res.cloudinary.com/test-cloud/raw/upload/example.pdf",
    };
    (cloudinary.v2.uploader.upload_stream as jest.Mock).mockImplementation(
      (
        options: Record<string, any>,
        callback: (error: Error | null, result?: any) => void
      ) => {
        callback(null, mockCloudinaryResult);
        return { end: jest.fn() };
      }
    );

    // Call the API
    const response = await POST(mockRequest as any);

    // Assertions
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.url).toBe("https://res.cloudinary.com/test-cloud/raw/upload/example.pdf");
    expect(cloudinary.v2.uploader.upload_stream).toHaveBeenCalledWith(
      { resource_type: "auto" },
      expect.any(Function)
    );
  });

  it("should return an error if no file is uploaded", async () => {
    // Mock request data with no file
    const formData = new FormData();
    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    };

    // Call the API
    const response = await POST(mockRequest as any);

    // Assertions
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("No file uploaded");
  });

  it("should handle Cloudinary upload errors", async () => {
    // Mock a file in memory
    const fileContent = Buffer.from("This is a test PDF file content.", "utf-8");
    const file = new File([fileContent], "example.pdf", {
      type: "application/pdf",
    });

    // Mock arrayBuffer() method
    file.arrayBuffer = jest.fn().mockResolvedValue(fileContent);

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    };

    // Mock Cloudinary error
    (cloudinary.v2.uploader.upload_stream as jest.Mock).mockImplementation(
      (
        options: Record<string, any>,
        callback: (error: Error | null, result?: any) => void
      ) => {
        callback(new Error("Cloudinary upload failed"), null);
        return { end: jest.fn() };
      }
    );

    // Call the API
    const response = await POST(mockRequest as any);

    // Assertions
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Upload failed");
  });
});