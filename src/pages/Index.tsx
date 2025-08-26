import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EventCard, Event } from "@/components/EventCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FileText, Users } from "lucide-react";

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [confirmedEvents, setConfirmedEvents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  const getSessionId = () => {
    let sessionId = localStorage.getItem("userSessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("userSessionId", sessionId);
    }
    return sessionId;
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;

      const formattedEvents: Event[] = data.map((event) => ({
        id: event.id.toString(),
        title: event.title || "",
        date: event.date || "",
        time: event.time || "",
        location: event.location || "",
        description: event.description || "",
        category: event.category || "Geral",
        maxAttendees: event.maxAttendees || 0,
        currentAttendees: event.current_attendees || 0,
        session_name: event.session_name,
        theme: event.theme,
        article_code: event.article_code,
        authors: event.authors,
        contact_email: event.contact_email,
      }));

      setEvents(formattedEvents);

      const uniqueCategories = Array.from(
        new Set(formattedEvents.map((ev) => ev.category))
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserConfirmations = async () => {
    try {
      const sessionId = getSessionId();
      const { data, error } = await supabase
        .from("event_confirmations")
        .select("event_id")
        .eq("session_id", sessionId);
      if (error) throw error;

      const confirmedIds = data.map((c) => c.event_id.toString());
      setConfirmedEvents(confirmedIds);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUserConfirmations();
  }, []);

  const handleConfirmEvent = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    if (event.currentAttendees >= event.maxAttendees) {
      toast({
        title: "Evento lotado",
        description: "Não há mais vagas disponíveis.",
        variant: "destructive",
      });
      return;
    }

    try {
      const sessionId = getSessionId();
      const { error } = await supabase
        .from("event_confirmations")
        .insert([{ event_id: parseInt(eventId), session_id: sessionId }]);
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("events")
        .update({ current_attendees: event.currentAttendees + 1 })
        .eq("id", parseInt(eventId));
      if (updateError) throw updateError;

      setConfirmedEvents((prev) => [...prev, eventId]);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, currentAttendees: e.currentAttendees + 1 } : e
        )
      );

      toast({
        title: "Presença confirmada!",
        description: `Você confirmou presença no evento: ${event.title}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar presença.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    try {
      const sessionId = getSessionId();
      const { error } = await supabase
        .from("event_confirmations")
        .delete()
        .eq("event_id", parseInt(eventId))
        .eq("session_id", sessionId);
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("events")
        .update({ current_attendees: Math.max(0, event.currentAttendees - 1) })
        .eq("id", parseInt(eventId));
      if (updateError) throw updateError;

      setConfirmedEvents((prev) => prev.filter((id) => id !== eventId));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, currentAttendees: Math.max(0, e.currentAttendees - 1) }
            : e
        )
      );

      toast({
        title: "Presença cancelada",
        description: `Você cancelou sua presença no evento: ${event.title}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar presença.",
        variant: "destructive",
      });
    }
  };

  const eventsByCategory = (category: string) =>
    events.filter((ev) => ev.category === category);

  const confirmedByCategory = (category: string) =>
    events.filter(
      (ev) => ev.category === category && confirmedEvents.includes(ev.id)
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* <div className="bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2 leading-tight">
              Agenda de Eventos
            </h1>
            <p className="text-xs sm:text-sm lg:text-lg opacity-90">
              Descubra e confirme presença nos melhores eventos
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Link to="/admin/import">
              <Button
                variant="ghost"
                size="sm"
                className="w-auto text-primary-foreground hover:bg-white/20 px-2 sm:px-3"
              >
                <FileText className="w-4 h-4 mr-2" /> Import
              </Button>
            </Link>
            <Link to="/admin/confirmations">
              <Button
                variant="ghost"
                size="sm"
                className="w-auto text-primary-foreground hover:bg-white/20 px-2 sm:px-3"
              >
                <Users className="w-4 h-4 mr-2" /> Admin
              </Button>
            </Link>
          </div>
        </div>
      </div> */}

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1 mb-4">
            <TabsTrigger value="all">Todos ({events.length})</TabsTrigger>
            <TabsTrigger value="my">Meus Eventos ({confirmedEvents.length})</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat} ({eventsByCategory(cat).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Aba Todos */}
          <TabsContent value="all">
            {isLoading ? (
              <p>Carregando eventos...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    isConfirmed={confirmedEvents.includes(ev.id)}
                    onConfirm={handleConfirmEvent}
                    onCancel={handleCancelEvent}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba Meus Eventos */}
          <TabsContent value="my">
            {isLoading ? (
              <p>Carregando eventos...</p>
            ) : confirmedEvents.length === 0 ? (
              <p>Nenhum evento confirmado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {events
                  .filter((ev) => confirmedEvents.includes(ev.id))
                  .map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      isConfirmed={true}
                      onConfirm={handleConfirmEvent}
                      onCancel={handleCancelEvent}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Abas por Categoria */}
          {categories.map((cat) => (
            <TabsContent key={cat} value={cat}>
              {isLoading ? (
                <p>Carregando eventos...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {eventsByCategory(cat).map((ev) => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      isConfirmed={confirmedEvents.includes(ev.id)}
                      onConfirm={handleConfirmEvent}
                      onCancel={handleCancelEvent}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
