-- ============================================================
-- PSHT Bojonegoro - Sistem Absensi Scan Wajah
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Aktifkan ekstensi pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabel anggota
CREATE TABLE public.anggota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_anggota VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    tingkatan VARCHAR(100) DEFAULT '',
    cabang VARCHAR(150) DEFAULT '',
    face_embedding VECTOR(128),
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel log absensi
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anggota_id UUID NOT NULL REFERENCES public.anggota(id) ON DELETE CASCADE,
    scanned_by VARCHAR(100) NOT NULL DEFAULT 'system',
    lokasi_kiosk VARCHAR(100),
    waktu_scan TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Terlambat', 'Izin')),
    tanggal DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index vector untuk pencarian cepat
CREATE INDEX ON public.anggota USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);

-- 5. Constraint unik: satu anggota hanya bisa absen sekali per hari
ALTER TABLE public.attendance_logs
    ADD CONSTRAINT unique_anggota_daily UNIQUE (anggota_id, tanggal);

-- 6. Index tambahan untuk query cepat
CREATE INDEX idx_attendance_tanggal ON public.attendance_logs(tanggal);
CREATE INDEX idx_attendance_anggota ON public.attendance_logs(anggota_id);
CREATE INDEX idx_anggota_nomor ON public.anggota(nomor_anggota);

-- 7. Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER anggota_updated_at
    BEFORE UPDATE ON public.anggota
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. RPC Function: match_face (cosine similarity)
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
-- 9. Row Level Security (RLS)
-- ============================================================

-- Aktifkan RLS
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: siapapun bisa INSERT attendance_logs (scanner publik)
CREATE POLICY "Publik bisa insert absensi"
    ON public.attendance_logs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: siapapun bisa SELECT attendance_logs (untuk tampilan TV)
CREATE POLICY "Publik bisa lihat absensi"
    ON public.attendance_logs
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: siapapun bisa SELECT anggota (untuk face matching)
CREATE POLICY "Publik bisa lihat anggota"
    ON public.anggota
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: hanya authenticated yang bisa INSERT/UPDATE/DELETE anggota
CREATE POLICY "Admin bisa kelola anggota"
    ON public.anggota
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: admin bisa DELETE attendance_logs
CREATE POLICY "Admin bisa hapus absensi"
    ON public.attendance_logs
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- 10. Aktifkan Realtime untuk kedua tabel
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anggota;

-- ============================================================
-- Selesai! Jalankan script ini sekali di SQL Editor Supabase.
-- ============================================================
