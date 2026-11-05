# 🗄️ MODELO DE DATOS — AXEL PLAY (POSTGRESQL / SUPABASE)

Este documento detalla la estructura relacional, tipos de datos, índices y políticas de seguridad (RLS) para la base de datos de **AXEL PLAY**.

---

## 1. DIAGRAMA ENTIDAD-RELACIÓN (SIMPLIFICADO)

```
[profiles (docentes)]
       │ 1
       │ N
[games] ────────── 1:N ────────── [questions]
       │ 1
       │ N
[sessions] ─────── 1:N ────────── [participants]
       │ 1                               │ 1
       │ N                               │ N
[session_events]                 [answers] ──── N:1 ──── [questions]
```

---

## 2. ESPECIFICACIÓN DDL COMPLETA (SQL)

```sql
-- Extensión para generación de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES DOCENTES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  school TEXT,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE JUEGOS Y CUESTIONARIOS
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  topic TEXT,
  grade_level TEXT DEFAULT 'secondary',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  cover_image TEXT,
  game_mode TEXT DEFAULT 'battle_live',
  scoring_mode TEXT DEFAULT 'time_based',
  settings JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  questions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PREGUNTAS
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  time_limit INTEGER DEFAULT 20,
  points INTEGER DEFAULT 1000,
  difficulty TEXT DEFAULT 'medium',
  order_index INTEGER DEFAULT 0,
  image_url TEXT,
  audio_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DEL BANCO DE PREGUNTAS REUTILIZABLES
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  subject TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE SESIONES EN VIVO (PARTIDAS)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('created', 'waiting', 'ready', 'in_progress', 'paused', 'finished', 'cancelled')),
  qr_token TEXT UNIQUE NOT NULL,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  current_question INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE PARTICIPANTES (ESTUDIANTES ANÓNIMOS VÍA QR)
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 1,
  lives INTEGER DEFAULT 3,
  team_id UUID,
  is_connected BOOLEAN DEFAULT true,
  active_power JSONB,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_session_nickname UNIQUE (session_id, nickname)
);

-- 7. TABLA DE RESPUESTAS REGISTRADAS
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  time_taken NUMERIC(5,2) DEFAULT 0,
  power_up_used TEXT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_participant_question UNIQUE (session_id, participant_id, question_id)
);

-- 8. TABLA DE EVENTOS DE SESIÓN Y PODERES (REALTIME)
CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. POLÍTICAS ROW LEVEL SECURITY (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Regla 1: Cada docente administra solo su información
CREATE POLICY "Docente ve su perfil"
  ON public.profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Docente gestiona sus juegos"
  ON public.games FOR ALL
  USING (teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Docente gestiona sus preguntas"
  ON public.questions FOR ALL
  USING (teacher_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Regla 2: Acceso anónimo de estudiantes a sesiones válidas por QR
CREATE POLICY "Estudiantes leen sesión si el QR coincide"
  ON public.sessions FOR SELECT
  USING (status IN ('waiting', 'in_progress', 'ready', 'paused'));

CREATE POLICY "Estudiantes se unen a la sesión"
  ON public.participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participantes leen su sesión"
  ON public.participants FOR SELECT
  USING (true);
```
