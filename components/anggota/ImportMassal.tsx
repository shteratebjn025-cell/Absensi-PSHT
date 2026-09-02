'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface RowData {
  nomor_anggota: string
  nama: string
  tingkatan: string
  cabang: string
}

interface ImportResult {
  total: number
  berhasil: number
  gagal: number
  errors: string[]
}

interface ImportMassalProps {
  onDone: () => void
}

export function ImportMassal({ onDone }: ImportMassalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<RowData[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const supabase = createClient()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      const rows: RowData[] = json.map((row) => ({
        nomor_anggota: String(row['nomor_anggota'] ?? row['Nomor Anggota'] ?? '').trim(),
        nama: String(row['nama'] ?? row['Nama'] ?? row['Nama Lengkap'] ?? '').trim(),
        tingkatan: String(row['tingkatan'] ?? row['Tingkatan'] ?? '').trim(),
        cabang: String(row['cabang'] ?? row['Cabang'] ?? '').trim(),
      })).filter((r) => r.nomor_anggota && r.nama)

      setPreview(rows)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (preview.length === 0) return
    setLoading(true)

    const errors: string[] = []
    let berhasil = 0

    // Proses batch per 50 baris
    const batchSize = 50
    for (let i = 0; i < preview.length; i += batchSize) {
      const batch = preview.slice(i, i + batchSize)
      const { error } = await supabase
        .from('anggota')
        .upsert(batch, { onConflict: 'nomor_anggota', ignoreDuplicates: false })

      if (error) {
        errors.push(`Baris ${i + 1}–${i + batch.length}: ${error.message}`)
      } else {
        berhasil += batch.length
      }
    }

    setResult({
      total: preview.length,
      berhasil,
      gagal: preview.length - berhasil,
      errors,
    })
    setLoading(false)
    if (berhasil > 0) onDone()
  }

  const downloadTemplate = () => {
    const template = [
      {
        nomor_anggota: 'BJN-001',
        nama: 'Contoh Nama Anggota',
        tingkatan: 'Muda',
        cabang: 'Bojonegoro Kota',
      },
      {
        nomor_anggota: 'BJN-002',
        nama: 'Contoh Anggota Dua',
        tingkatan: 'Warga',
        cabang: 'Bojonegoro Barat',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 25 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'Template_Import_Anggota_PSHT.xlsx')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Download template */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Gunakan template Excel
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            Kolom wajib: nomor_anggota, nama, tingkatan, cabang
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
        >
          <Download className="h-4 w-4" />
          Template
        </Button>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload file Excel anggota"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {fileName || 'Klik untuk upload file Excel (.xlsx)'}
          </p>
          {fileName && (
            <p className="text-xs text-gray-500">{preview.length} baris valid ditemukan</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
          aria-label="Input file Excel anggota"
        />
      </div>

      {/* Preview tabel */}
      {preview.length > 0 && !result && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b text-sm font-medium text-gray-700">
            Preview {preview.length} anggota akan diimport
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">No. Anggota</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Tingkatan</th>
                  <th className="px-3 py-2 text-left">Cabang</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{row.nomor_anggota}</td>
                    <td className="px-3 py-2">{row.nama}</td>
                    <td className="px-3 py-2 text-gray-600">{row.tingkatan}</td>
                    <td className="px-3 py-2 text-gray-600">{row.cabang}</td>
                  </tr>
                ))}
                {preview.length > 100 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-center text-gray-500 text-xs">
                      ... dan {preview.length - 100} baris lainnya
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hasil import */}
      {result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              <strong>{result.berhasil}</strong> dari {result.total} anggota berhasil diimport
            </p>
          </div>
          {result.gagal > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-medium">
                  {result.gagal} gagal
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aksi */}
      {preview.length > 0 && !result && (
        <Button
          onClick={handleImport}
          loading={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengimport {preview.length} anggota...
            </>
          ) : (
            `Import ${preview.length} Anggota`
          )}
        </Button>
      )}
    </div>
  )
}
