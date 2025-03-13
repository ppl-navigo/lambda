"use client"
import { useState } from "react"
import DocumentForm from "../components/Form/DocumentForm"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { MathpixMarkdown, MathpixLoader } from "mathpix-markdown-it"

interface Pihak {
  nama: string
  hak_pihak: string[]
  kewajiban_pihak: string[]
}

export default function LegalDocumentsPage() {
  const [generatedDocument, setGeneratedDocument] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    "Jenis Dokumen Hukum"
  )
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGenerateDocument = async (formData: any) => {
    setIsGenerating(true)
    setGeneratedDocument("")
    setError(null)

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
      }

      console.log("Sending data to API:", apiData)

      // Make API call with streaming enabled
      const promptText = [
        `Jenis Kontrak: ${apiData.jenis_kontrak}`,
        `Judul: ${apiData.judul}`,
        `Tujuan: ${apiData.tujuan}`,
        "",
        "Pihak:",
        (apiData.pihak as Pihak[])
          .map(
            (pihak) =>
              `- ${pihak.nama}\n  Hak: ${pihak.hak_pihak.join(
                ", "
              )}\n  Kewajiban: ${pihak.kewajiban_pihak.join(", ")}`
          )
          .join("\n"),
        "",
        `Mulai Kerja Sama: ${apiData.mulai_kerja_sama}`,
        `Akhir Kerja Sama: ${apiData.akhir_kerja_sama}`,
        `Komentar Revisi: ${apiData.comment || "Tidak ada"}`,
      ].join("\n")

      // Make API call with streaming enabled
      const res = await fetch("/api/legal-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promptText }),
      })

      console.log("API response:", promptText)

      if (!res.ok) {
        throw new Error("Failed to fetch the generated document")
      }

      if (!res.body) {
        throw new Error("ReadableStream not supported in this browser.")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let done = false

      // Read the streamed data and update the document state as chunks arrive
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value)
          // SSE protocol: Remove all occurrences of "data:" and trim extra whitespace/newlines
          const cleanedChunk = chunk.replace(/data:\s*/g, "").trim()
          setGeneratedDocument((prev) => prev + cleanedChunk)
        }
      }
    } catch (err) {
      console.error("Failed to generate document:", err)
      setError(
        `Failed to generate document: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      )
      setGeneratedDocument("")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetryGenerate = () => {
    // This will trigger the form to resubmit its current data
    if (window.confirm("Are you sure you want to regenerate the document?")) {
      setPrompt("")
      document.dispatchEvent(new CustomEvent("regenerateDocument"))
    }
  }

  const renderDocumentContent = () => {
    if (error) {
      return <p className="text-red-500">❌ {error}</p>
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
      )
    }

    if (isGenerating) {
      return (
        <p className="text-gray-400 animate-pulse">
          Memulai pembuatan dokumen...
        </p>
      )
    }

    return (
      <p className="text-gray-400" data-testid="loading-message">
        📄 Generated document will show here...
      </p>
    )
  }

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-4 py-2 border border-[#27272A] bg-[#09090B] hover:bg-gray-700 text-white"
                >
                  {selectedDocumentType}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#27272A] border border-gray-700 text-white rounded-md shadow-lg w-[200px]"
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

            {/* Action Buttons */}
            <Button
              variant="outline"
              className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
              disabled={!generatedDocument || isGenerating}
              onClick={() => {
                // Export functionality would be implemented here
                alert("Download functionality to be implemented")
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
                alert("Share functionality to be implemented")
              }}
            >
              Bagikan
            </Button>

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
                !generatedDocument || isGenerating
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-white text-gray-900 hover:bg-gray-300"
              }`}
              onClick={handleRetryGenerate}
              disabled={!generatedDocument || isGenerating}
              data-testid="retry-button"
            >
              Coba Buat Ulang
            </button>
          </div>

          {/* Right Side - Form */}
          <div className="w-1/3">
            <DocumentForm
              onGenerate={handleGenerateDocument}
              documentType={selectedDocumentType}
            />
          </div>
        </div>
      </div>
    </>
  )
}
