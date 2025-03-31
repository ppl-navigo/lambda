import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

// Define the type for the Cloudinary upload result
interface CloudinaryUploadResult {
  secure_url: string;
}

export async function POST(request: Request) {
    try {
      // Parse the incoming request to extract the file
      const formData = await request.formData();
      const file = formData.get("file") as File;
  
      if (!file) {
        console.error("No file uploaded");
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
  
      // Convert the file to a buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer());
  
      // Upload the file to Cloudinary
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        ).end(fileBuffer);
      });
  
      // Return the secure URL of the uploaded file
      return NextResponse.json({ url: result.secure_url }, { status: 200 });
    } catch (error) {
      console.error("Upload failed:", error); // Log the error for debugging
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }