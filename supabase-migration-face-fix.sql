-- ============================================================
-- MIGRASI: Fix fungsi match_face + ganti index IVFFlat → HNSW
--
-- MASALAH YANG DIPERBAIKI:
-- 1. IVFFlat dengan lists=100 tidak cocok untuk dataset kecil
--    (<1000 baris), hasil pencarian approximate bisa meleset.
--    HNSW lebih akurat dan tidak butuh minimum data.
-- 2. Fungsi match_face belum punya parameter ranting_filter,
--    sehingga filter ranting di FaceScanner tidak dieksekusi.
--
-- Jalankan di Supabase SQL Editor (aman dijalankan berulang).
-- ============================================================

-- 1. Hapus index IVFFlat lama
DROP INDEX IF EXISTS anggota_face_embedding_idx;

-- 2. Buat index HNSW — lebih akurat untuk dataset kecil
--    m=16 ef_construction=64 adalah nilai default yang baik
CREATE INDEX IF NOT EXISTS anggota_face_embedding_hnsw
    ON public.anggota
    USING hnsw (face_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 3. Drop semua versi match_face yang mungkin ada
DROP FUNCTION IF EXISTS match_face(vector, float, int);
DROP FUNCTION IF EXISTS match_face(vector, float, int, text);

-- 4. Buat ulang match_face dengan parameter ranting_filter
--    ranting_filter = '' atau NULL → cari semua ranting (tidak difilter)
--    ranting_filter = 'Ponco'     → hanya anggota ranting Ponco
CREATE OR REPLACE FUNCTION match_face(
    query_embedding  VECTOR(128),
    match_threshold  FLOAT   DEFAULT 0.65,
    match_count      INT     DEFAULT 3,
    ranting_filter   TEXT    DEFAULT ''
)
RETURNS TABLE (
    id            UUID,
    nama          VARCHAR,
    nomor_anggota VARCHAR,
    tingkatan     VARCHAR,
    cabang        VARCHAR,
    ranting       VARCHAR,
    photo_url     TEXT,
    similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.nama,
        a.nomor_anggota,
        a.tingkatan,
        a.cabang,
        a.ranting,
        a.photo_url,
        1 - (a.face_embedding <=> query_embedding) AS similarity
    FROM public.anggota a
    WHERE
        a.face_embedding IS NOT NULL
        AND 1 - (a.face_embedding <=> query_embedding) > match_threshold
        -- Filter ranting hanya jika parameter diisi (bukan kosong/null)
        AND (ranting_filter = '' OR ranting_filter IS NULL OR a.ranting = ranting_filter)
    ORDER BY a.face_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- Selesai! Setelah menjalankan ini, tidak perlu restart apapun.
-- Fungsi langsung aktif untuk scan berikutnya.
-- ============================================================
