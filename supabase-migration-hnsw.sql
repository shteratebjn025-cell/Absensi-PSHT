-- ============================================================
-- MIGRASI: Ganti index ivfflat → hnsw untuk akurasi lebih baik
-- pada dataset kecil (<10.000 anggota)
--
-- ivfflat memerlukan banyak data untuk akurat (lists × 39 rows).
-- hnsw tidak butuh training data dan lebih akurat untuk semua ukuran.
--
-- Jalankan di Supabase SQL Editor (satu kali).
-- ============================================================

-- Hapus index lama
DROP INDEX IF EXISTS anggota_face_embedding_idx;

-- Buat index hnsw (lebih akurat, tidak perlu minimum data)
-- m=16, ef_construction=64 adalah nilai default yang baik untuk production
CREATE INDEX ON public.anggota
  USING hnsw (face_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Selesai.
-- ============================================================
