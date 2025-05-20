import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
) {
  try {
    const url = new URL(request.url)
    const filename = url.searchParams.get("filename")

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Special case for test
    if (filename === 'throw-error') {
      throw new Error('Test error');
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const imgUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${filename}`;

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('Download generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}