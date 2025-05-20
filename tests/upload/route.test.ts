/**
 * @jest-environment node
 */
import { POST } from "@/app/api/upload/route";
import { NextRequest } from "next/server";
import { PassThrough } from "stream";

// Memperbaiki mock Cloudinary dengan mengembalikan Node stream yang valid
// Mock browser APIs for Node environment
global.Blob = class Blob {
  size: number;
  type: string;

  constructor(bits: BlobPart[], options: BlobPropertyBag = {}) {
    this.type = options.type || '';
    this.size = bits.reduce((acc, part) =>
      acc + (typeof part === 'string' ? part.length : 'byteLength' in part ? part.byteLength : 'size' in part ? part.size : 0), 0);
  }

  arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  slice() { return new Blob([]); }
  text() { return Promise.resolve(''); }
  stream() { return {} as any; }
} as any;

global.File = class MockFile extends global.Blob {
  name: string;
  lastModified: number;

  constructor(bits: BlobPart[], name: string, options: FilePropertyBag = {}) {
    super(bits, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
} as any;

global.FormData = class FormData {
  private data = new Map();

  append(name: string, value: string | Blob, fileName?: string) {
    this.data.set(name, value);
  }

  get(name: string) {
    return this.data.get(name);
  }

  getAll(name: string) {
    const value = this.data.get(name);
    return value ? [value] : [];
  }

  has(name: string) {
    return this.data.has(name);
  }

  delete(name: string) {
    this.data.delete(name);
  }

  set(name: string, value: string | Blob, fileName?: string) {
    this.data.set(name, value);
  }
} as any;

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        const stream = new PassThrough();
        // Saat stream selesai (finish), callback dipanggil dengan hasil yang diharapkan
        stream.on("finish", () => {
          callback(null, { secure_url: "https://mocked-url.com/file.jpg" });
        });
        return stream;
      }),
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
      // Simple implementation that just returns the body if it's FormData
      if (this.body instanceof FormData) {
        return this.body;
      }
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
    const file = new File(["test content"], "test.txt");
    const formData = new FormData();
    formData.append("file", file);

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://mocked-url.com/file.jpg",
    });
  });

  it("rejects missing files", async () => {
    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: new FormData(),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "No file uploaded",
    });
  });

  it("handles Cloudinary errors", async () => {
    // Override mock untuk mensimulasikan error dari Cloudinary
    const cloudinary = require("cloudinary").v2;
    cloudinary.uploader.upload_stream.mockImplementationOnce((options: Record<string, any>, callback: (error: Error | null, result: any | null) => void) => {
      const stream = new PassThrough();
      stream.on("finish", () => {
        callback(new Error("Cloudinary error"), null);
      });
      return stream;
    });

    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const formData = new FormData();
    formData.append("file", file);

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Upload failed",
    });
  });

  it("handles form data errors", async () => {
    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: "invalid-body",
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Upload failed",
    });
  });
});