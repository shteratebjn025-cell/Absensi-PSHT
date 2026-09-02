-- ============================================================
-- MIGRASI: Tambah kolom 'ranting' di tabel anggota
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

-- 1. Tambah kolom ranting ke tabel anggota
ALTER TABLE public.anggota
    ADD COLUMN IF NOT EXISTS ranting VARCHAR(150) DEFAULT '';

-- 2. Drop dulu karena return type berubah (tambah kolom ranting)
DROP FUNCTION IF EXISTS match_face(vector, float, int);

-- 3. Buat ulang fungsi match_face agar ikut mengembalikan ranting
CREATE OR REPLACE FUNCTION match_face(
    query_embedding VECTOR(128),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    nama VARCHAR,
    nomor_anggota VARCHAR,
    tingkatan VARCHAR,
    cabang VARCHAR,
    ranting VARCHAR,
    photo_url TEXT,
    similarity FLOAT
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
    WHERE a.face_embedding IS NOT NULL
      AND 1 - (a.face_embedding <=> query_embedding) > match_threshold
    ORDER BY a.face_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- Selesai! Jalankan script ini di SQL Editor Supabase.
-- ============================================================
