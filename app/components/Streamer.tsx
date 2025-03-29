"use client";

interface StreamerProps {
  pdfUrl: string;
}

const Streamer: React.FC<{ pdfUrl: string }> = ({ pdfUrl }) => {
  if (!pdfUrl) return null;

  return (
    <div className="h-full w-full bg-gray-900 border-l border-gray-700 transition-all duration-300">
      <iframe
        src={pdfUrl} // Direct Cloudinary URL
        className="w-full h-full"
        title="PDF Viewer"
      ></iframe>
    </div>
  );
};


export default Streamer;
