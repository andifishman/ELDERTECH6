ALTER TABLE public.tutoriales
ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'principiante'
CHECK (nivel IN ('principiante', 'intermedio', 'avanzado'));
