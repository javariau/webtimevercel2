-- MENAMBAHKAN KOLOM PREMIUM_UNTIL KE TABEL PROFILES
-- Kolom ini diperlukan untuk fitur masa aktif premium (paket bulanan/tahunan)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone;

-- Opsional: Tambahkan index untuk performa query
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until ON public.profiles(premium_until);
