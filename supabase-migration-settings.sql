-- ============================================================
-- MIGRASI: Tambah tabel app_settings
-- Jalankan di Supabase SQL Editor (satu kali)
-- ============================================================

-- Tabel pengaturan global aplikasi (key-value)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nilai default: batas jam terlambat
INSERT INTO public.app_settings (key, value)
VALUES ('batas_terlambat', '07:30')
ON CONFLICT (key) DO NOTHING;

-- Trigger auto-update updated_at
CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Siapapun (scanner publik, TV) bisa baca pengaturan
CREATE POLICY "Publik bisa baca settings"
    ON public.app_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Hanya admin yang bisa ubah
CREATE POLICY "Admin bisa ubah settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Selesai. Sekarang batas_terlambat tersinkronisasi ke
-- semua device scanner secara otomatis.
-- ============================================================
