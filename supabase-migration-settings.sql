-- ============================================================
-- MIGRASI: Tambah tabel app_settings
-- Aman dijalankan berulang kali (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value)
VALUES ('batas_terlambat', '07:30')
ON CONFLICT (key) DO NOTHING;

-- Drop dulu sebelum buat ulang agar tidak error duplicate
DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;

CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publik bisa baca settings" ON public.app_settings;
CREATE POLICY "Publik bisa baca settings"
    ON public.app_settings FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin bisa ubah settings" ON public.app_settings;
CREATE POLICY "Admin bisa ubah settings"
    ON public.app_settings FOR ALL
    TO authenticated USING (true) WITH CHECK (true);
