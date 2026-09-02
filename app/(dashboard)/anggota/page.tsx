'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Filter,
  X,
} from 'lucide-react'

export default function AnggotaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat...</div>}>
      <AnggotaContent />
    </Suspense>
  )
}

function AnggotaContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [anggota, setAnggota] = useState<Anggota[]>([])
  const [loading, setLoading] = useState(true)

  // Filter — baca dari URL, fallback ke ''
  const search = searchParams.get('q') ?? ''
  const filterTingkatan = searchParams.get('tingkatan') ?? ''
  const filterCabang = searchParams.get('cabang') ?? ''
  const filterRanting = searchParams.get('ranting') ?? ''

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
    ranting: '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  // Helper: update URL params tanpa reload
  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

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

  // Opsi unik untuk dropdown filter
  const opsiTingkatan = useMemo(
    () => [...new Set(anggota.map((a) => a.tingkatan).filter(Boolean))].sort(),
    [anggota]
  )
  const opsiCabang = useMemo(
    () => [...new Set(anggota.map((a) => a.cabang).filter(Boolean))].sort(),
    [anggota]
  )
  const opsiRanting = useMemo(
    () => [...new Set(anggota.map((a) => a.ranting).filter(Boolean))].sort(),
    [anggota]
  )

  const filtered = useMemo(
    () =>
      anggota.filter((a) => {
        const matchSearch =
          !search ||
          a.nama.toLowerCase().includes(search.toLowerCase()) ||
          a.nomor_anggota.toLowerCase().includes(search.toLowerCase())
        const matchTingkatan = !filterTingkatan || a.tingkatan === filterTingkatan
        const matchCabang = !filterCabang || a.cabang === filterCabang
        const matchRanting = !filterRanting || a.ranting === filterRanting
        return matchSearch && matchTingkatan && matchCabang && matchRanting
      }),
    [anggota, search, filterTingkatan, filterCabang, filterRanting]
  )

  const hasFilter = filterTingkatan || filterCabang || filterRanting || search

  const openTambah = () => {
    setIsEdit(false)
    setForm({ nomor_anggota: '', nama: '', tingkatan: '', cabang: '', ranting: '' })
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
      ranting: a.ranting ?? '',
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
      else { setShowTambah(false); fetchAnggota() }
    } else {
      const { error } = await supabase.from('anggota').insert(form)
      if (error) setFormError(error.message)
      else { setShowTambah(false); fetchAnggota() }
    }
    setFormLoading(false)
  }

  const handleHapus = async () => {
    if (!selectedAnggota) return
    await supabase.from('anggota').delete().eq('id', selectedAnggota.id)
    setShowHapus(false)
    fetchAnggota()
  }

  const resetFilter = () => {
    router.replace('?', { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Anggota</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length !== anggota.length
              ? `${filtered.length} dari ${anggota.length} anggota`
              : `${anggota.length} anggota terdaftar`}
            {' · '}
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

      {/* Search & Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau nomor anggota..."
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Cari anggota"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterTingkatan}
            onChange={(e) => setParam('tingkatan', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Filter tingkatan"
          >
            <option value="">Semua Tingkatan</option>
            {opsiTingkatan.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterCabang}
            onChange={(e) => setParam('cabang', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Filter cabang"
          >
            <option value="">Semua Cabang</option>
            {opsiCabang.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterRanting}
            onChange={(e) => setParam('ranting', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Filter ranting"
          >
            <option value="">Semua Ranting</option>
            {opsiRanting.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={resetFilter}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <X className="h-3 w-3" />
              Reset filter
            </button>
          )}
        </div>
      </div>

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
                <th className="px-4 py-3 text-left hidden xl:table-cell">Ranting</th>
                <th className="px-4 py-3 text-left">Wajah</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    {hasFilter ? 'Tidak ada anggota yang cocok dengan filter.' : 'Belum ada anggota.'}
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
                          <p className="text-xs text-gray-400 md:hidden">
                            {a.tingkatan}{a.ranting ? ` · ${a.ranting}` : ''}
                          </p>
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
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">
                      {a.ranting || '-'}
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
                          onClick={() => { setSelectedAnggota(a); setShowEnroll(true) }}
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
                          onClick={() => { setSelectedAnggota(a); setShowHapus(true) }}
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
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Massal Anggota" size="lg">
        <ImportMassal onDone={() => { setShowImport(false); fetchAnggota() }} />
      </Modal>

      {/* Modal Tambah/Edit */}
      <Modal open={showTambah} onClose={() => setShowTambah(false)} title={isEdit ? 'Edit Anggota' : 'Tambah Anggota Baru'}>
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
            placeholder="Nama cabang"
          />
          <Input
            label="Ranting"
            value={form.ranting}
            onChange={(e) => setForm({ ...form, ranting: e.target.value })}
            placeholder="Nama ranting"
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTambah(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSimpan} loading={formLoading} className="flex-1">
              {isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Enroll Wajah */}
      <Modal open={showEnroll} onClose={() => setShowEnroll(false)} title="Daftarkan Wajah" size="lg">
        {selectedAnggota && (
          <EnrollFace
            anggota={selectedAnggota}
            onSuccess={(updated) => {
              setShowEnroll(false)
              setAnggota((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
            }}
            onCancel={() => setShowEnroll(false)}
          />
        )}
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal open={showHapus} onClose={() => setShowHapus(false)} title="Hapus Anggota" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-gray-700">
            Yakin ingin menghapus <strong>{selectedAnggota?.nama}</strong>? Data absensi terkait juga akan terhapus.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHapus(false)} className="flex-1">Batal</Button>
            <Button variant="destructive" onClick={handleHapus} className="flex-1">Hapus</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
