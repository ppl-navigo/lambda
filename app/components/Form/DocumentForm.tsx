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

interface Party {
  id: string
  customName: string
}

const DocumentForm: React.FC<DocumentFormProps> = ({ onGenerate }) => {
  const [judul, setJudul] = useState("")
  const [tujuan, setTujuan] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [parties, setParties] = useState<Party[]>([
    { id: "Pihak 1", customName: "" },
    { id: "Pihak 2", customName: "" },
  ])
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
    const newPartyId = `Pihak ${parties.length + 1}`
    setParties([...parties, { id: newPartyId, customName: "" }])
    setRights({ ...rights, [newPartyId]: [""] })
    setObligations({ ...obligations, [newPartyId]: [""] })
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
        {parties.map((party, idx) => (
          <Input
            key={party.id}
            value={party.customName}
            onChange={(e) => {
              const updatedParties = [...parties]
              updatedParties[idx].customName = e.target.value
              setParties(updatedParties)
            }}
            className="bg-[#09090B] border border-[#27272A] text-white placeholder-[#A1A1AA] mb-2"
            placeholder={`${party.id} : Nama atau Organisasi`}
          />
        ))}
        <div className="flex gap-2">
          <Button
            className="flex-1 mt-2 bg-white text-black hover:bg-gray-300"
            onClick={addParty}
          >
            Tambahkan Pihak
          </Button>
          <Button
            className="flex-1 mt-2 bg-red-500 text-white hover:bg-red-600"
            onClick={() => {
              if (parties.length <= 2) return
              const lastParty = parties[parties.length - 1]
              const newParties = parties.slice(0, -1)
              setParties(newParties)

              // Remove rights and obligations for the deleted party
              const newRights = { ...rights }
              delete newRights[lastParty.id]
              setRights(newRights)

              const newObligations = { ...obligations }
              delete newObligations[lastParty.id]
              setObligations(newObligations)
            }}
            disabled={parties.length <= 2}
          >
            Hapus Pihak
          </Button>
        </div>
      </div>

      {/* Hak & Kewajiban */}
      {/* Garis batas */}
      <hr className="border-[#27272A] mt-8 mb-4" />

      {parties.map((party) => (
        <div key={party.id} className="mt-6">
          <h3 className="text-lg font-semibold mb-1">
            {party.id}
            {party.customName ? ` : ${party.customName}` : ""}
          </h3>

          {/* Hak */}
          <label
            htmlFor={`hak-${party.id}`}
            className="text-[#FAFAFA] block mt-1 mb-2"
          >
            Hak
          </label>
          {rights[party.id]?.map((right, index) => (
            <div key={`${party.id}-right-${index}`} className="flex gap-2 mb-2">
              <Input
                value={right}
                onChange={(e) => updateRights(party.id, index, e.target.value)}
                className="bg-[#09090B] text-white placeholder-[#A1A1AA] border border-[#27272A]"
                placeholder="Hak Pihak"
              />
              <Button
                type="button"
                onClick={() => removeRight(party.id, index)}
                className="bg-red-500 text-white"
              >
                Hapus Hak
              </Button>
            </div>
          ))}
          <Button
            onClick={() => addRight(party.id)}
            className="w-full bg-[#27272A] text-white mt-2"
          >
            Tambah Hak
          </Button>

          {/* Kewajiban */}
          <label
            htmlFor={`kewajiban-${party.id}`}
            className="text-[#FAFAFA] block mt-6 mb-2"
          >
            Kewajiban
          </label>
          {obligations[party.id]?.map((obligation, index) => (
            <div
              key={`${party.id}-obligation-${index}`}
              className="flex gap-2 mb-2"
            >
              <Input
                value={obligation}
                onChange={(e) =>
                  updateObligations(party.id, index, e.target.value)
                }
                className="bg-[#09090B] text-white placeholder-[#A1A1AA] border border-[#27272A]"
                placeholder="Kewajiban Pihak"
              />
              <Button
                type="button"
                onClick={() => removeObligation(party.id, index)}
                className="bg-red-500 text-white"
              >
                Hapus Kewajiban
              </Button>
            </div>
          ))}
          <Button
            onClick={() => addObligation(party.id)}
            className="w-full bg-[#27272A] text-white mt-2"
          >
            Tambah Kewajiban
          </Button>
        </div>
      ))}

      <div className="mt-6">
        <div className="flex gap-4">
          <Button className="flex-1 bg-black text-white hover:bg-black-700 border border-white">
            Simpan
          </Button>
          <Button
            className="flex-1 bg-white text-black hover:bg-gray-300"
            onClick={onGenerate}
          >
            Buat Dokumen
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DocumentForm
