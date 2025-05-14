-- Esquema SQL para o Supabase com sistema de autenticação
-- Este esquema criará as tabelas necessárias para o sistema de gerenciamento de tarefas
-- com suporte a autenticação de usuários

-- Ativar as extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configuração de Políticas RLS (Row Level Security)
-- Isso permitirá que cada usuário acesse apenas seus próprios dados

-- 1. Tabela de perfis de usuários (será criada automaticamente após o registro)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela de tarefas vinculada ao perfil do usuário
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('day', 'week', 'month', 'year')),
  startdate TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  enddate TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'finished', 'late')),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Tabela de comentários para as tarefas
CREATE TABLE IF NOT EXISTS public.task_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Tabela para configurações do usuário
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES public.profiles(id) PRIMARY KEY,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  notifications_enabled BOOLEAN DEFAULT true,
  default_view TEXT DEFAULT 'dashboard' CHECK (default_view IN ('dashboard', 'calendario', 'analises')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar o trigger às tabelas
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para criar um perfil automaticamente quando um novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'https://ui-avatars.com/api/?name=' || (NEW.raw_user_meta_data->>'full_name')
  );
  
  -- Criar configurações padrão para o usuário
  INSERT INTO public.user_settings (user_id, theme, notifications_enabled, default_view)
  VALUES (NEW.id, 'light', true, 'dashboard');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função quando um novo usuário é criado no auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Configurar Row Level Security (RLS) para proteger os dados
-- Habilitar RLS nas tabelas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas para garantir que usuários só possam acessar seus próprios dados
-- Políticas para tarefas
CREATE POLICY "Usuários podem visualizar apenas suas próprias tarefas"
ON public.tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir apenas suas próprias tarefas"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar apenas suas próprias tarefas"
ON public.tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir apenas suas próprias tarefas"
ON public.tasks FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para comentários
CREATE POLICY "Usuários podem visualizar comentários de suas próprias tarefas"
ON public.task_comments FOR SELECT
USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT user_id FROM public.tasks WHERE id = task_comments.task_id
  )
);

CREATE POLICY "Usuários podem inserir comentários em suas próprias tarefas"
ON public.task_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tasks WHERE id = task_comments.task_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem excluir apenas seus próprios comentários"
ON public.task_comments FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para perfis
CREATE POLICY "Usuários podem visualizar seus próprios perfis"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Políticas para configurações
CREATE POLICY "Usuários podem visualizar suas próprias configurações"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Permitir acesso anônimo para criar conta (registrar-se)
-- Esta política não é necessária se você estiver usando o widget de autenticação do Supabase 