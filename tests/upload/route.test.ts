/**
 * @jest-environment node
 */
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";

// Mock Cloudinary with default successful upload
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => ({
        end: jest.fn().mockImplementation(() => {
          callback(null, { secure_url: "https://mocked-url.com/file.jpg" });
        })
      }))
    },
  },
}));

// Mock Next.js server utilities
jest.mock("next/server", () => ({
  NextRequest: class {
    url: string;
    method: string;
    headers: Headers;
    body: any;

    constructor(url: string, options: { method: string; body?: any }) {
      this.url = url;
      this.method = options.method;
      this.headers = new Headers();
      this.body = options.body || null;
    }

    async formData() {
      if (this.body instanceof FormData) return this.body;
      throw new Error("FormData error");
    }
  },
  NextResponse: {
    json: (body: any, init?: { status: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

describe("POST /api/upload (Route Handler)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully uploads file", async () => {
    const file = new File(["test"], "test.txt");
    const formData = new FormData();
    formData.append("file", file);

    const response = await POST(new NextRequest("http://localhost", {
      method: "POST",
      body: formData,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://mocked-url.com/file.jpg"
    });
  });

  it("rejects missing files", async () => {
    const response = await POST(new NextRequest("http://localhost", {
      method: "POST",
      body: new FormData(),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "No file uploaded"
    });
  });

  it("handles Cloudinary errors", async () => {
    // Override Cloudinary mock to simulate error
    const cloudinary = require("cloudinary").v2;
    cloudinary.uploader.upload_stream.mockImplementationOnce((options: any, callback: any) => ({
      end: jest.fn().mockImplementation(() => {
        callback(new Error("Cloudinary error"), null);
      })
    }));

    const file = new File(["test"], "test.txt");
    const formData = new FormData();
    formData.append("file", file);

    const response = await POST(new NextRequest("http://localhost", {
      method: "POST",
      body: formData,
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Upload failed"
    });
  });

  it("handles form data errors", async () => {
    const response = await POST(new NextRequest("http://localhost", {
      method: "POST",
      body: "invalid-body",
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Upload failed"
    });
  });
});