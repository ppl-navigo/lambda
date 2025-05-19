import { checkBalanceThenDeduct } from "@/utils/checkBalanceThenDeduct";
import { supabase } from "@/utils/supabase";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function OPTIONS() {
  const res = new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
  return res;
}

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
  const headers = request.headers;
  const accessToken = headers.get("Authorization")?.split(" ")[1];
  const refreshToken = headers.get("X-Refresh-Token");
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing access/refresh token" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: sessionData } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (!sessionData.session || !sessionData.session.user) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("User ID:", sessionData.session.user.id);
    await checkBalanceThenDeduct(
      sessionData.session.user.id,
      30000,
    )
  } catch (error) {
    console.error("Balance check failed:", error);
    return new Response(
      JSON.stringify({ error: "Insufficient balance" }),
      {
        status: 402, headers: {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      }
    );
  }

  try {

    // Parse the incoming request to extract the file
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("No file uploaded");
      return new Response(
        JSON.stringify({ error: "No file uploaded" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert the file to a buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate unique ID for filename
    const uniqueId = uuidv4();

    // Upload the file to Cloudinary
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "uploads",
          public_id: uniqueId,
        },
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
    return new Response(
      JSON.stringify({ url: result.secure_url }),
      {
        status: 200, headers:
        {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      }
    );
  } catch (error) {
    console.error("Upload failed:", error);
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      {
        status: 500, headers: {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      }
    );
  }
}