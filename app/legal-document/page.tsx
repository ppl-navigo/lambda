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

export default function LegalDocumentsPage() {
  const [generatedDocument, setGeneratedDocument] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [selectedDocumentType, setSelectedDocumentType] = useState(
    "Jenis Dokumen Hukum"
  )

  const handleGenerateDocument = async () => {
    setIsGenerating(true)
    setGeneratedDocument("Generating document...")

    // Simulate streaming document generation
    setTimeout(() => {
      setGeneratedDocument(
        "📜 Your generated document content will appear here."
      )
      setIsGenerating(false)
    }, 3000)
  }

  return (
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
              <DropdownMenuItem onClick={() => setSelectedDocumentType("MoU")}>
                MoU
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSelectedDocumentType("Kontrak Kerja")}
              >
                Kontrak Kerja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action Buttons */}
          <Button
            variant="outline"
            className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
          >
            Unduh
          </Button>
          <Button
            variant="outline"
            className="border border-[#27272A] bg-[#27272A] hover:bg-gray-700 text-white"
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
          <div className="flex-grow border border-[#27272A] p-4 rounded-lg overflow-auto">
            {isGenerating ? (
              <p className="text-gray-400 animate-pulse">
                ⏳ Generating document...
              </p>
            ) : generatedDocument ? (
              <p>{generatedDocument}</p>
            ) : (
              <p className="text-gray-400">
                📄 Generated document will show here...
              </p>
            )}
          </div>

          {/* General Prompting Box (Disabled if No Document) */}
          <textarea
            className={`mt-4 p-3 rounded-lg w-full border ${
              generatedDocument
                ? "bg-[#09090B] text-white border-[#27272A]"
                : "bg-gray-700 text-gray-500 border-[#27272A] cursor-not-allowed"
            }`}
            placeholder="Tambahkan komentar revisi..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!generatedDocument}
          ></textarea>

          {/* Retry Button (Disabled if No Document) */}
          <button
            className={`mt-4 px-4 py-2 rounded-lg ${
              generatedDocument
                ? "bg-white text-gray-900 hover:bg-gray-300"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
            onClick={() => setGeneratedDocument("")}
            disabled={!generatedDocument}
          >
            Coba Buat Ulang
          </button>
        </div>

        {/* Right Side - Form */}
        <div className="w-1/3">
          <DocumentForm onGenerate={handleGenerateDocument} />
        </div>
      </div>
    </div>
  )
}
