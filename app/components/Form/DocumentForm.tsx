"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DocumentFormProps {
  onGenerate: () => void
}

const DocumentForm: React.FC<DocumentFormProps> = ({ onGenerate }) => {
  const [judul, setJudul] = useState("")
  const [tujuan, setTujuan] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [parties, setParties] = useState(["Pihak 1", "Pihak 2"])
  const [rights, setRights] = useState<{ [key: string]: string[] }>({
    "Pihak 1": [""],
    "Pihak 2": [""],
  })
  const [obligations, setObligations] = useState<{ [key: string]: string[] }>({
    "Pihak 1": [""],
    "Pihak 2": [""],
  })
  const [errorMessage, setErrorMessage] = useState("")

  const handleEndDateChange = (date: Date | undefined) => {
    if (startDate && date && date < startDate) {
      setErrorMessage("Tanggal selesai tidak boleh sebelum tanggal mulai.")
      return
    }
    setErrorMessage("") // Clear error when valid
    setEndDate(date ?? null)
  }

  // Tambahkan pihak baru
  const addParty = () => {
    const newParty = `Pihak ${parties.length + 1}`
    setParties([...parties, newParty])
    setRights({ ...rights, [newParty]: [""] })
    setObligations({ ...obligations, [newParty]: [""] })
  }

  // Update Hak & Kewajiban
  const updateRights = (party: string, index: number, value: string) => {
    const updatedRights = [...rights[party]]
    updatedRights[index] = value
    setRights({ ...rights, [party]: updatedRights })
  }

  const updateObligations = (party: string, index: number, value: string) => {
    const updatedObligations = [...obligations[party]]
    updatedObligations[index] = value
    setObligations({ ...obligations, [party]: updatedObligations })
  }
  // Tambahkan Hak/Kewajiban baru
  const addRight = (party: string) => {
    setRights({ ...rights, [party]: [...rights[party], ""] })
  }

  const addObligation = (party: string) => {
    setObligations({ ...obligations, [party]: [...obligations[party], ""] })
  }

  // Hapus Hak/Kewajiban
  const removeRight = (party: string, index: number) => {
    const updatedRights = rights[party].filter((_, i) => i !== index)
    setRights({ ...rights, [party]: updatedRights })
  }

  const removeObligation = (party: string, index: number) => {
    const updatedObligations = obligations[party].filter((_, i) => i !== index)
    setObligations({ ...obligations, [party]: updatedObligations })
  }
  return (
    <div className="p-8 bg-[#09090B] text-white rounded-md border border-[#27272A] w-[495px]">
      {/* Judul */}
      <div className="mb-4">
        <label
          htmlFor="judul"
          className="block text-lg font-semibold text-[#FAFAFA] mb-2"
        >
          Judul
        </label>
        <Input
          id="judul"
          className="bg-[#09090B] border border-[#27272A] text-white placeholder-[#A1A1AA]"
          placeholder="MoU ini tentang..."
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
        />
      </div>

      {/* Tujuan */}
      <div className="mb-4">
        <label
          htmlFor="tujuan"
          className="block text-lg font-semibold text-[#FAFAFA] mb-2"
        >
          Tujuan
        </label>
        <Textarea
          id="tujuan"
          className="bg-[#09090B] border border-[#27272A] text-white placeholder-[#A1A1AA]"
          placeholder="Kenapa Anda membuat MoU ini?"
          value={tujuan}
          onChange={(e) => setTujuan(e.target.value)}
        />
      </div>

      {/* Durasi Kerja Sama */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
          Durasi Kerja Sama
        </h3>
        <div className="flex gap-4">
          {/* Tanggal Mulai */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2 bg-[#09090B] border border-[#27272A] text-white rounded-md">
                {startDate ? format(startDate, "dd/MM/yyyy") : "Tanggal Mulai"}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => setStartDate(date || null)}
              />
            </PopoverContent>
          </Popover>

          {/* Tanggal Selesai */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2 bg-[#09090B] border border-[#27272A] text-white rounded-md">
                {endDate ? format(endDate, "dd/MM/yyyy") : "Tanggal Selesai"}
                <CalendarIcon className="w-4 h-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={handleEndDateChange}
              />

              {/* Show error message in UI */}
              {errorMessage && (
                <p className="text-red-500 mt-2">{errorMessage}</p>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Pihak-Pihak */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
          Pihak-Pihak
        </h3>
        {parties.map((party) => (
          <Input
            key={party} // Use party name as the key instead of index
            value={party.startsWith("Pihak") ? "" : party} // Hapus teks default saat diketik
            onChange={(e) => {
              const updatedParties = [...parties]
              const oldPartyName = party
              const newPartyName =
                e.target.value || `Pihak ${parties.indexOf(party) + 1}`

              const updatedRights = { ...rights }
              const updatedObligations = { ...obligations }

              // Perbarui nama dalam daftar parties
              const partyIndex = parties.indexOf(party)
              updatedParties[partyIndex] = newPartyName

              if (oldPartyName !== newPartyName) {
                updatedRights[newPartyName] = updatedRights[oldPartyName] || [
                  "",
                ]
                updatedObligations[newPartyName] = updatedObligations[
                  oldPartyName
                ] || [""]
                delete updatedRights[oldPartyName]
                delete updatedObligations[oldPartyName]
              }

              setParties(updatedParties)
              setRights(updatedRights)
              setObligations(updatedObligations)
            }}
            className="bg-[#09090B] border border-[#27272A] text-white placeholder-[#A1A1AA] mb-2"
            placeholder={`Pihak ${parties.indexOf(party) + 1}`}
          />
        ))}

        {parties.length > 2 ? (
          <div className="flex gap-2 mt-2">
            <Button
              className="flex-1 bg-white text-black hover:bg-gray-300"
              onClick={addParty}
            >
              Tambahkan Pihak
            </Button>
            <Button
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                const updatedParties = parties.slice(0, -1)
                const removedParty = parties[parties.length - 1]

                const updatedRights = { ...rights }
                const updatedObligations = { ...obligations }
                delete updatedRights[removedParty]
                delete updatedObligations[removedParty]

                setParties(updatedParties)
                setRights(updatedRights)
                setObligations(updatedObligations)
              }}
            >
              Hapus Pihak
            </Button>
          </div>
        ) : (
          <Button
            className="w-full mt-2 bg-white text-black hover:bg-gray-300"
            onClick={addParty}
          >
            Tambahkan Pihak
          </Button>
        )}
      </div>

      {/* Hak & Kewajiban */}
      {/* Garis batas */}
      <hr className="border-[#27272A] mt-8 mb-4" />

      {parties.map((party) => (
        <div key={party} className="mt-6">
          <h3 className="text-lg font-semibold mb-1">{party}</h3>

          {/* Hak */}
          <label
            htmlFor={`hak-${party}`}
            className="text-[#FAFAFA] block mt-1 mb-2"
          >
            Hak
          </label>
          {rights[party].map((right, index) => (
            <div key={`${party}-hak-${index}`} className="mb-2">
              <Input
                id={`hak-${party}-${index}`} // Unique id for accessibility
                className="bg-[#09090B] border border-[#27272A] text-white"
                value={right}
                onChange={(e) => updateRights(party, index, e.target.value)}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-black hover:bg-gray-300"
              onClick={() => addRight(party)}
            >
              Tambah Hak
            </Button>
            {rights[party].length > 1 && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => removeRight(party, rights[party].length - 1)}
              >
                Hapus Hak
              </Button>
            )}
          </div>

          {/* Kewajiban */}
          <label
            htmlFor={`kewajiban-${party}`}
            className="text-[#FAFAFA] block mt-4 mb-2"
          >
            Kewajiban
          </label>
          {obligations[party].map((obligation, index) => (
            <div key={`${party}-kewajiban-${index}`} className="mb-2">
              <Input
                id={`kewajiban-${party}-${index}`} // Unique id for accessibility
                className="bg-[#09090B] border border-[#27272A] text-white"
                value={obligation}
                onChange={(e) =>
                  updateObligations(party, index, e.target.value)
                }
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-black hover:bg-gray-300"
              onClick={() => addObligation(party)}
            >
              Tambah Kewajiban
            </Button>
            {obligations[party].length > 1 && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() =>
                  removeObligation(party, obligations[party].length - 1)
                }
              >
                Hapus Kewajiban
              </Button>
            )}
          </div>
          {/* Garis batas */}
          <hr className="border-[#27272A] mt-8 mb-4" />
        </div>
      ))}

      {/* Tombol */}
      <div className="flex justify-between mt-6">
        <Button
          className="bg-white text-black hover:bg-gray-300 w-40"
          onClick={onGenerate}
        >
          Hasilkan Dokumen
        </Button>
        <Button className="bg-[#CBD5E1] text-black hover:bg-[#A3B6CC] w-40">
          Simpan Dokumen
        </Button>
      </div>
    </div>
  )
}

export default DocumentForm
