-- Habilitar RLS nas tabelas que não têm
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_confirmations ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela events (acesso público para leitura)
CREATE POLICY "Anyone can view events" ON public.events
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert events" ON public.events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update events" ON public.events
FOR UPDATE USING (true);

-- Políticas para a tabela event_confirmations (acesso público)
CREATE POLICY "Anyone can view confirmations" ON public.event_confirmations
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert confirmations" ON public.event_confirmations
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete confirmations" ON public.event_confirmations
FOR DELETE USING (true);