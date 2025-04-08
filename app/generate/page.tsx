"use client";
import { useState } from "react";
import DocumentForm from "../components/Form/DocumentForm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { MathpixMarkdown, MathpixLoader } from "mathpix-markdown-it"
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import { marked } from 'marked';
import { saveAs } from 'file-saver';

interface Pihak {
  nama: string;
  hak_pihak: string[];
  kewajiban_pihak: string[];
}

export default function LegalDocumentsPage() {
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    "Jenis Dokumen Hukum"
  );
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  // Add state to store the last submitted form data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastFormData, setLastFormData] = useState<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGenerateDocument = async (formData: any) => {
    setIsGenerating(true);
    setError(null); // Reset error message sebelum memulai proses baru
    setShowSaved(false); // Hide saved message when regenerating
    setCanDownload(false);
    // Store the form data for potential retry
    setLastFormData(formData);
    console.log("ini adalah pihak", formData.parties);
    try {
      // Transform form data to match API structure
      const apiData = {
        jenis_kontrak: selectedDocumentType,
        judul: formData.judul,
        tujuan: formData.tujuan,
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pihak: formData.parties.map((party: any) => ({
          nama: party.customName || party.id,
          hak_pihak: formData.rights[party.id].filter(
            (right: string) => right.trim() !== ""
          ),
          kewajiban_pihak: formData.obligations[party.id].filter(
            (obligation: string) => obligation.trim() !== ""
          ),
        })),
        mulai_kerja_sama: formData.startDate
          ? formData.startDate.toISOString().split("T")[0]
          : null,
        akhir_kerja_sama: formData.endDate
          ? formData.endDate.toISOString().split("T")[0]
          : null,
        comment: prompt,
      };

      const promptText = [
        `Jenis Kontrak: ${apiData.jenis_kontrak}`,
        `Judul: ${apiData.judul}`,
        `Tujuan: ${apiData.tujuan}`,
        "",
        "Pihak:",
        (apiData.pihak as Pihak[])
          .map(
            (pihak) =>
              `- ${pihak.nama}
  Hak: ${pihak.hak_pihak.join(", ")}
  Kewajiban: ${pihak.kewajiban_pihak.join(", ")}`
          )
          .join("\n"),
        "",
        `Mulai Kerja Sama: ${apiData.mulai_kerja_sama}`,
        `Akhir Kerja Sama: ${apiData.akhir_kerja_sama}`,
        `Komentar Revisi: ${apiData.comment || "Tidak ada"}`,
      ].join("\n");

      const res = await fetch("/api/legal-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promptText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);

        if (errorData && errorData.error === "Duplicate prompt") {
          throw new Error("Duplicate prompt detected");
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (!res.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";
      setGeneratedDocument(""); // Reset generated document
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        console.log("Received chunk awal:", value);
        const chunk = decoder.decode(value);
        const cleanedChunk = chunk.replace(/data:\s*/g, "").trim();
        fullText += cleanedChunk;
        setGeneratedDocument((prev) => prev + cleanedChunk);
      }

      // After streaming is complete, save to Supabase
      try {
        const { error: supabaseError } = await supabase
          .from('documents')
          .insert([
            {
              title: apiData.judul,
              content: fullText,
              created_at: new Date().toISOString(),
              document_type: apiData.jenis_kontrak,
            }
          ]);
        console.log("Saved to Supabase");
        setShowSaved(true);

        if (supabaseError) {
          console.error('Error saving to Supabase:', supabaseError);
        }
      } catch (error) {
        console.error('Error saving to Supabase:', error);
      }

      setGeneratedDocument(fullText);
      setCanDownload(true);

    } catch (err) {
      console.error("Failed to generate document:", err);

      // Tidak menghapus dokumen yang sudah di-generate
      if (err instanceof Error && err.message === "Duplicate prompt detected") {
        alert(
          "Anda mengirimkan informasi yang sama, silakan tambahkan atau ubah informasi yang akan Anda kirimkan"
        );
      } else {
        setError(
          `Failed to generate document: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }

      // Jangan reset generatedDocument di sini
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryGenerate = async () => {
    if (window.confirm("Apakah Anda yakin ingin membuat ulang dokumen?")) {
      if (!prompt.trim()) {
        alert("Komentar revisi tidak boleh kosong.");
        return;
      }
      if (!lastFormData) {
        alert("Tidak ada data formulir yang tersedia.");
        return;
      }
      // Pass the stored form data to handleGenerateDocument
      console.log("ini adalah pihak", lastFormData.parties);
      await handleGenerateDocument(lastFormData);
      setPrompt("");
    }
  };

  const handleDownload = async () => {
    if (generatedDocument) {
      try {
        // Parse markdown to HTML tokens
        const tokens = marked.lexer(generatedDocument);
        
        // Convert tokens to docx paragraphs
        const docxParagraphs = tokens.map(token => {
          if (token.type === 'heading') {
            return new Paragraph({
              children: [new TextRun({ text: token.text, bold: true, size: 32 })],
              spacing: { after: 200 }
            });
          } else if (token.type === 'paragraph') {
            return new Paragraph({
              children: [new TextRun({ text: token.text })],
              spacing: { after: 200 }
            });
          }
          return new Paragraph({ children: [new TextRun({ text: '' })] });
        });

        // Create docx document
        const doc = new DocxDocument({
          sections: [{
            properties: {},
            children: docxParagraphs
          }]
        });

        // Generate and save the docx file
        const buffer = await Packer.toBlob(doc);
        const fileName = lastFormData?.judul || 'document';
        saveAs(buffer, `${fileName}-${new Date().toISOString()}.docx`);
      } catch (error) {
        console.error('Error generating DOCX:', error);
        setError('Failed to generate document download');
      }
    }
  };

  const renderDocumentContent = () => {
    if (error) {
      return <p className="text-red-500">❌ {error}</p>;
    }

    if (generatedDocument) {
      return (
        <MathpixLoader>
          <div className="whitespace-pre-wrap">
            <MathpixMarkdown text={generatedDocument} />
            {isGenerating && (
              <span className="inline-block animate-pulse">▌</span>
            )}
          </div>
        </MathpixLoader>
      );
    }

    if (isGenerating) {
      return (
        <p className="text-gray-400 animate-pulse">
          Memulai pembuatan dokumen...
        </p>
      );
    }

    return null;
  };

  return (
    <>
      <div className="min-h-screen bg-[#09090B] text-white p-10">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#FAFAFA] whitespace-nowrap">
            Mulai Membuat Dokumen
          </h2>

          <div className="flex items-center gap-2">
            {/* Dropdown Jenis Dokumen */}
            <div className="flex items-center gap-2">
              {showSaved && (
                <div className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
                  Document Saved
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-4 py-2 border border-[#27272A] bg-[#09090B] hover:bg-gray-700 text-white"
                    data-testid="document-type-button"
                  >
                    {selectedDocumentType}{" "}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-[#27272A] border border-gray-700 text-white rounded-md shadow-lg"
                >
                  <DropdownMenuItem
                    onClick={() => setSelectedDocumentType("MoU")}
                  >
                    MoU
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedDocumentType("Kontrak Kerja")}
                  >
                    Kontrak Kerja
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSelectedDocumentType("Perjanjian Kerjasama")
                    }
                  >
                    Perjanjian Kerjasama
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
              disabled={!generatedDocument || isGenerating}
              onClick={() => {
                // Export functionality would be implemented here
                alert("Download functionality to be implemented");
              }}
            >
              Unduh
            </Button>
            <Button
              variant="outline"
              className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
              disabled={!generatedDocument || isGenerating}
              onClick={() => {
                // Share functionality would be implemented here
                alert("Share functionality to be implemented");
              }}
            >
              Bagikan
            </Button>
            <Link href="/generate/history">
              <Button
                variant="outline"
                className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
                disabled={isGenerating}
              >
                History
              </Button>
            </Link>

            {/* Dropdown menu button "..." */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-10 h-10 flex items-center justify-center border border-[#27272A] bg-[#27272A] hover:bg-gray-700"
                  data-testid="more-options-button"
                >
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#27272A] border border-gray-700 text-white rounded-md shadow-lg w-40"
              >
                <DropdownMenuItem>Menu 1</DropdownMenuItem>
                <DropdownMenuItem>Menu 2</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-10">
          {/* Left Side - Document Streaming Preview */}
          <div className="w-2/3 bg-[#09090B] p-6 rounded-lg border border-[#27272A] flex flex-col">
            <div
              className="flex justify-between items-center mb-4"
            >
              <h2 className="text-xl font-semibold">Preview Dokumen</h2>
              {canDownload && (
                <Button
                  onClick={handleDownload}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={!canDownload}
                >
                  Download Document
                </Button>
              )}
            </div>
            <div
              className="flex-grow border border-[#27272A] p-4 rounded-lg overflow-auto"
              data-testid="document-preview-container"
            >
              {renderDocumentContent()}
            </div>

            {/* General Prompting Box (Disabled initially and when generating) */}
            <textarea
              className={`mt-4 p-3 rounded-lg w-full border ${
                generatedDocument && !isGenerating
                  ? "bg-[#09090B] text-white border-[#27272A]"
                  : "bg-gray-700 text-gray-500 border-[#27272A] cursor-not-allowed"
              }`}
              placeholder="Tambahkan komentar revisi..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={!generatedDocument || isGenerating}
            ></textarea>
            {/* Retry Button */}
            <button
              className={`mt-4 px-4 py-2 rounded-lg ${
                !generatedDocument || isGenerating || !prompt.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-white text-gray-900 hover:bg-gray-300"
              }`}
              onClick={handleRetryGenerate}
              disabled={!generatedDocument || isGenerating || !prompt.trim()}
              data-testid="retry-button"
            >
              Coba Buat Ulang
            </button>
          </div>

          {/* Right Side - Form */}
          <div className="w-1/3">
            <div className="flex flex-col gap-4">
              <DocumentForm
                onGenerate={handleGenerateDocument}
                documentType={selectedDocumentType}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
