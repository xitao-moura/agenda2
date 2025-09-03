import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Save, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const AdminImport = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedEvent, setEditedEvent] = useState<any>({});
  const { toast } = useToast();

  const [filterDate, setFilterDate] = useState("");
  const [filterSessao, setFilterSessao] = useState("");
  const [filterTema, setFilterTema] = useState("");
  const [filterAutor, setFilterAutor] = useState("");

  const [category, setCategory] = useState("");

  // 🔹 Buscar eventos
  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível carregar os eventos", variant: "destructive" });
    } else {
      setEvents(data || []);
      setFilteredEvents(data || []);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 🔹 Aplicar filtros
  useEffect(() => {
    let filtered = [...events];
    if (filterDate) filtered = filtered.filter((e) => e.date?.includes(filterDate));
    if (filterSessao) filtered = filtered.filter((e) => e.session_name?.toLowerCase().includes(filterSessao.toLowerCase()));
    if (filterTema) filtered = filtered.filter((e) => e.theme?.toLowerCase().includes(filterTema.toLowerCase()));
    if (filterAutor) filtered = filtered.filter((e) => e.authors?.toLowerCase().includes(filterAutor.toLowerCase()));
    setFilteredEvents(filtered);
  }, [filterDate, filterSessao, filterTema, filterAutor, events]);

  // 🔹 Upload CSV
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!category) {
      toast({ title: "Erro", description: "Selecione uma categoria antes de importar.", variant: "destructive" });
      return;
    }

    if (file.type !== "text/csv") {
      toast({ title: "Erro", description: "Por favor, selecione um arquivo CSV.", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (result.errors.length) {
        toast({ title: "Erro", description: "Erro ao processar o CSV. Verifique o formato.", variant: "destructive" });
        return;
      }

      const eventsToInsert = result.data.map((ev: any) => ({
        title: ev.Artigo || null,
        description: null,
        date: ev.Dia || null,
        time: ev.Horário || null,
        location: null,
        maxAttendees: 500,
        current_attendees: 0,
        imageUrl: null,
        price: null,
        session_name: ev.Sessão || null,
        theme: ev.Tema || null,
        article_code: ev["Código Artigo"] || null,
        authors: ev.Autores || null,
        contact_email: ev.EMAIL || null,
        category, // categoria escolhida
        sala: ev.sala || null,
      }));

      const { error } = await supabase.from("events").insert(eventsToInsert);

      if (error) {
        toast({ title: "Erro", description: "Erro ao importar eventos.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso!", description: `${eventsToInsert.length} eventos importados.` });
        fetchEvents();
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Erro ao processar o arquivo CSV.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // 🔹 Editar evento
  const startEditing = (event: any) => {
    setEditingId(event.id);
    setEditedEvent(event);
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("events").update(editedEvent).eq("id", editingId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Evento atualizado." });
      setEditingId(null);
      fetchEvents();
    }
  };

  // 🔹 Deletar evento específico (com retorno para confirmar deleção)
  const deleteEvent = async (id: number | string) => {
    const { error, data } = await supabase.from("events").delete().eq("id", id).select("id");
    if (error) {
      toast({ title: "Erro", description: "Não foi possível deletar o evento.", variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({
        title: "Nenhuma linha deletada",
        description: "Verifique as políticas de RLS: talvez seu usuário não tenha permissão para excluir este registro.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Sucesso!", description: `Evento #${id} deletado.` });
    fetchEvents();
  };

  // 🔹 Deletar todos eventos (usa condição ampla + retorno dos IDs deletados)
  const deleteAllEvents = async () => {
    const { error, data } = await supabase.from("events").delete().gt("id", 0).select("id");
    if (error) {
      toast({ title: "Erro", description: "Não foi possível deletar todos os eventos.", variant: "destructive" });
      return;
    }
    const count = data?.length ?? 0;
    if (count === 0) {
      toast({
        title: "Nenhuma linha deletada",
        description: "Isso geralmente indica RLS bloqueando a operação. Garanta que exista uma policy de DELETE permitindo seu usuário.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Sucesso!", description: `${count} eventos deletados.` });
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* UPLOAD CSV */}
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo CSV</CardTitle>
            <CardDescription>Selecione uma categoria e um arquivo CSV com os dados dos eventos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Select de Categoria */}
            <div>
              <Label>Categoria</Label>
              <Select onValueChange={(val) => setCategory(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="palestras magnas ">Palestras Magnas </SelectItem>
                  <SelectItem value="seminários">Seminários</SelectItem>
                  <SelectItem value="apresentação de artigos - orais">Apresentação de artigos - orais</SelectItem>
                  <SelectItem value="apresentação de artigos - posters">Apresentação de artigos - posters</SelectItem>
                  <SelectItem value="cursos">Cursos</SelectItem>
                  <SelectItem value="concursos">Concursos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} disabled={isUploading} />
          </CardContent>
        </Card>

        {/* FILTROS */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            <div>
              <Label>Sessão</Label>
              <Input value={filterSessao} onChange={(e) => setFilterSessao(e.target.value)} placeholder="Sessão" />
            </div>
            <div>
              <Label>Tema</Label>
              <Input value={filterTema} onChange={(e) => setFilterTema(e.target.value)} placeholder="Tema" />
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={filterAutor} onChange={(e) => setFilterAutor(e.target.value)} placeholder="Autor" />
            </div>
          </CardContent>
        </Card>

        {/* LISTA DE EVENTOS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Eventos Cadastrados</CardTitle>
              <CardDescription>Gerencie os eventos já importados</CardDescription>
            </div>
            {filteredEvents.length > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteAllEvents} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Deletar Todos
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <p className="text-muted-foreground">Nenhum evento encontrado.</p>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((ev) => (
                  <div key={ev.id} className="p-4 border rounded-lg flex flex-col gap-2">
                    {editingId === ev.id ? (
                      <>
                        <Input value={editedEvent.title} onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })} />
                        <Input value={editedEvent.session_name || ""} onChange={(e) => setEditedEvent({ ...editedEvent, session_name: e.target.value })} />
                        <Input value={editedEvent.theme || ""} onChange={(e) => setEditedEvent({ ...editedEvent, theme: e.target.value })} />
                        <Input value={editedEvent.time || ""} onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })} />
                        <Input value={editedEvent.article_code || ""} onChange={(e) => setEditedEvent({ ...editedEvent, article_code: e.target.value })} />
                        <Input value={editedEvent.authors || ""} onChange={(e) => setEditedEvent({ ...editedEvent, authors: e.target.value })} />
                        <Input value={editedEvent.contact_email || ""} onChange={(e) => setEditedEvent({ ...editedEvent, contact_email: e.target.value })} />
                        <Input value={editedEvent.category || ""} onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })} />
                        <Button onClick={saveEdit} className="mt-2 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Salvar
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="font-bold">{ev.title}</p>
                        <p>{ev.date} {ev.time}</p>
                        <p><b>Sessão:</b> {ev.session_name || "—"} | <b>Tema:</b> {ev.theme || "—"} | <b>Autor:</b> {ev.authors || "—"}</p>
                        <p><b>Código Artigo:</b> {ev.article_code || "—"} | <b>Email:</b> {ev.contact_email || "—"}</p>
                        <p><b>Categoria:</b> {ev.category || "—"}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEditing(ev)} className="flex items-center gap-2">
                            <Edit className="w-4 h-4" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteEvent(ev.id)} className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Deletar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminImport;
