import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Extract params from request URL
    const url = new URL(request.url);
    const filename = url.pathname.split('/').pop();  // Extract filename from the URL path
    
    if (!filename || typeof filename !== "string" || filename.trim() === "") {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Simulate an unexpected error (e.g., due to invalid logic)
    if (filename === "throw-error") {
      throw new Error("Simulated unexpected error");
    }

    // Build the Cloudinary download URL
    const downloadUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${filename}`;

    // Return the download URL as JSON
    return NextResponse.json({ url: downloadUrl }, { status: 200 });
  } catch (error) {
    console.error("Download failed:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}