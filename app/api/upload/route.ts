import { checkBalanceThenDeduct } from "@/utils/checkBalanceThenDeduct";
import { supabase } from "@/utils/supabase";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

export async function OPTIONS() {
  const response = NextResponse.json({ status: 200 })
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, authorization, X-Refresh-Token")
  return response
}
// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

// Tipe untuk hasil upload dari Cloudinary
interface CloudinaryUploadResult {
  secure_url: string;
}

// Fungsi untuk mengonversi web ReadableStream ke Node Readable stream
function webStreamToNodeStream(webStream: ReadableStream<Uint8Array>): Readable {
  const reader = webStream.getReader();
  return new Readable({
    read() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.push(null);
            return;
          }
          this.push(value);
        })
        .catch(err => {
          this.destroy(err);
        });
    },
  });
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

    // Generate unique ID untuk nama file
    const uniqueId = uuidv4();

    // Manfaatkan adapter untuk mengonversi web stream ke Node stream
    const fileStream = webStreamToNodeStream(file.stream());

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
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
      );
      fileStream.pipe(uploadStream);
    });

    // Kembalikan secure URL dari file yang diunggah
    return new Response(
      JSON.stringify({ url: result.secure_url }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      }
    );
  } catch (error) {
    console.error("Upload failed:", error);
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      }
    );
  }
}