'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ImportMassal } from '@/components/anggota/ImportMassal'
import { EnrollFace } from '@/components/scanner/EnrollFace'
import type { Anggota } from '@/types'
import {
  Plus,
  Upload,
  Search,
  ScanFace,
  Pencil,
  Trash2,
  UserCheck,
} from 'lucide-react'

export default function AnggotaPage() {
  const supabase = createClient()
  const [anggota, setAnggota] = useState<Anggota[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showImport, setShowImport] = useState(false)
  const [showTambah, setShowTambah] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [selectedAnggota, setSelectedAnggota] = useState<Anggota | null>(null)
  const [showHapus, setShowHapus] = useState(false)

  // Form tambah/edit
  const [form, setForm] = useState({
    nomor_anggota: '',
    nama: '',
    tingkatan: '',
    cabang: '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  const fetchAnggota = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('anggota')
      .select('*')
      .order('nama', { ascending: true })
    setAnggota(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAnggota()
  }, [fetchAnggota])

  const filtered = anggota.filter(
    (a) =>
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      a.nomor_anggota.toLowerCase().includes(search.toLowerCase()) ||
      a.tingkatan?.toLowerCase().includes(search.toLowerCase()) ||
      a.cabang?.toLowerCase().includes(search.toLowerCase())
  )

  const openTambah = () => {
    setIsEdit(false)
    setForm({ nomor_anggota: '', nama: '', tingkatan: '', cabang: '' })
    setFormError('')
    setShowTambah(true)
  }

  const openEdit = (a: Anggota) => {
    setIsEdit(true)
    setSelectedAnggota(a)
    setForm({
      nomor_anggota: a.nomor_anggota,
      nama: a.nama,
      tingkatan: a.tingkatan,
      cabang: a.cabang,
    })
    setFormError('')
    setShowTambah(true)
  }

  const handleSimpan = async () => {
    if (!form.nomor_anggota || !form.nama) {
      setFormError('Nomor anggota dan nama wajib diisi.')
      return
    }
    setFormLoading(true)
    setFormError('')

    if (isEdit && selectedAnggota) {
      const { error } = await supabase
        .from('anggota')
        .update(form)
        .eq('id', selectedAnggota.id)
      if (error) setFormError(error.message)
      else {
        setShowTambah(false)
        fetchAnggota()
      }
    } else {
      const { error } = await supabase.from('anggota').insert(form)
      if (error) setFormError(error.message)
      else {
        setShowTambah(false)
        fetchAnggota()
      }
    }
    setFormLoading(false)
  }

  const handleHapus = async () => {
    if (!selectedAnggota) return
    await supabase.from('anggota').delete().eq('id', selectedAnggota.id)
    setShowHapus(false)
    fetchAnggota()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Anggota</h1>
          <p className="text-gray-500 text-sm mt-1">
            {anggota.length} anggota terdaftar ·{' '}
            {anggota.filter((a) => a.face_embedding).length} sudah ada wajah
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import Massal
          </Button>
          <Button onClick={openTambah}>
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Cari nama, nomor anggota, tingkatan..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Anggota</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">No. Anggota</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Tingkatan</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Cabang</th>
                <th className="px-4 py-3 text-left">Wajah</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    {search ? 'Tidak ada hasil pencarian.' : 'Belum ada anggota.'}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                          {a.nama[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{a.nama}</p>
                          <p className="text-xs text-gray-500 sm:hidden">{a.nomor_anggota}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs hidden sm:table-cell">
                      {a.nomor_anggota}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {a.tingkatan || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {a.cabang || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {a.face_embedding ? (
                        <Badge variant="green">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Terdaftar
                        </Badge>
                      ) : (
                        <Badge variant="red">Belum</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedAnggota(a)
                            setShowEnroll(true)
                          }}
                          title="Daftarkan wajah"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          aria-label={`Daftarkan wajah ${a.nama}`}
                        >
                          <ScanFace className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          aria-label={`Edit ${a.nama}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAnggota(a)
                            setShowHapus(true)
                          }}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          aria-label={`Hapus ${a.nama}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Import Massal */}
      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Massal Anggota"
        size="lg"
      >
        <ImportMassal onDone={() => { setShowImport(false); fetchAnggota() }} />
      </Modal>

      {/* Modal Tambah/Edit */}
      <Modal
        open={showTambah}
        onClose={() => setShowTambah(false)}
        title={isEdit ? 'Edit Anggota' : 'Tambah Anggota Baru'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nomor Anggota"
            value={form.nomor_anggota}
            onChange={(e) => setForm({ ...form, nomor_anggota: e.target.value })}
            placeholder="BJN-001"
          />
          <Input
            label="Nama Lengkap"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="Masukkan nama lengkap"
          />
          <Input
            label="Tingkatan"
            value={form.tingkatan}
            onChange={(e) => setForm({ ...form, tingkatan: e.target.value })}
            placeholder="Muda / Warga / dll"
          />
          <Input
            label="Cabang"
            value={form.cabang}
            onChange={(e) => setForm({ ...form, cabang: e.target.value })}
            placeholder="Nama cabang / rayon"
          />
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleSimpan} loading={formLoading} className="flex-1">
              {isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Enroll Wajah */}
      <Modal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        title="Daftarkan Wajah"
        size="lg"
      >
        {selectedAnggota && (
          <EnrollFace
            anggota={selectedAnggota}
            onSuccess={(updated) => {
              setShowEnroll(false)
              setAnggota((prev) =>
                prev.map((a) => (a.id === updated.id ? updated : a))
              )
            }}
            onCancel={() => setShowEnroll(false)}
          />
        )}
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={showHapus}
        onClose={() => setShowHapus(false)}
        title="Hapus Anggota"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-700">
            Yakin ingin menghapus{' '}
            <strong>{selectedAnggota?.nama}</strong>? Data absensi terkait juga
            akan terhapus.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHapus(false)} className="flex-1">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleHapus} className="flex-1">
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
