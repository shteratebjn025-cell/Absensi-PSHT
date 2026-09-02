-- ============================================================
-- MIGRASI: Update match_face dengan filter ranting opsional
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

-- Drop dulu karena signature berubah (tambah parameter ranting_filter)
DROP FUNCTION IF EXISTS match_face(vector, float, int);
DROP FUNCTION IF EXISTS match_face(vector, float, int, text);

-- Buat ulang fungsi match_face dengan parameter ranting_filter opsional.
-- Jika ranting_filter diisi (tidak kosong), hanya cari dalam ranting itu.
-- Ini mengurangi ruang pencarian vector → akurasi lebih tinggi + lebih cepat.
CREATE OR REPLACE FUNCTION match_face(
    query_embedding VECTOR(128),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 1,
    ranting_filter TEXT DEFAULT ''
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
      -- Filter ranting: jika ranting_filter kosong, cari semua
      AND (ranting_filter = '' OR a.ranting = ranting_filter)
    ORDER BY a.face_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Tambah index pada kolom ranting untuk mempercepat filter
CREATE INDEX IF NOT EXISTS idx_anggota_ranting ON public.anggota(ranting);

-- Pastikan kolom ranting_kiosk ada di app_settings (untuk simpan ranting per kiosk)
-- app_settings sudah ada dari migrasi sebelumnya, tidak perlu create lagi.
-- Hanya dokumentasi: key yang dipakai adalah 'ranting_kiosk'

-- ============================================================
-- Selesai! Jalankan script ini di SQL Editor Supabase.
-- ============================================================
