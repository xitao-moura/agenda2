-- Atualizar a tabela events para incluir os novos campos do CSV
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS session_name TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS article_code TEXT,
ADD COLUMN IF NOT EXISTS authors TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Atualizar comentários para documentar os campos
COMMENT ON COLUMN public.events.session_name IS 'Nome da sessão do evento';
COMMENT ON COLUMN public.events.theme IS 'Tema do evento';
COMMENT ON COLUMN public.events.article_code IS 'Código do artigo relacionado';
COMMENT ON COLUMN public.events.authors IS 'Autores do artigo/apresentação';
COMMENT ON COLUMN public.events.contact_email IS 'Email de contato do evento';