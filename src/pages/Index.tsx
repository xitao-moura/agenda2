import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EventCard, Event } from "@/components/EventCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Settings, FileText, Users } from "lucide-react";

const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [confirmedEvents, setConfirmedEvents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Gerar ID de sessão único para o usuário
  const getSessionId = () => {
    let sessionId = localStorage.getItem('userSessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('userSessionId', sessionId);
    }
    return sessionId;
  };

  // Carregar eventos do Supabase
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      const formattedEvents: Event[] = data.map(event => ({
        id: event.id.toString(),
        title: event.title || '',
        date: event.date || '',
        time: event.time || '',
        location: event.location || '',
        description: event.description || '',
        category: event.theme || 'Geral',
        maxAttendees: event.max_attendees || event.maxAttendees || 0,
        currentAttendees: event.current_attendees || 0,
        session_name: event.session_name,
        theme: event.theme,
        article_code: event.article_code,
        authors: event.authors,
        contact_email: event.contact_email
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar confirmações do usuário
  const fetchUserConfirmations = async () => {
    try {
      const sessionId = getSessionId();
      const { data, error } = await supabase
        .from('event_confirmations')
        .select('event_id')
        .eq('session_id', sessionId);
      
      if (error) throw error;
      
      const confirmedIds = data.map(confirmation => confirmation.event_id.toString());
      setConfirmedEvents(confirmedIds);
    } catch (error) {
      console.error('Erro ao carregar confirmações:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUserConfirmations();
  }, []);

  const handleConfirmEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event && event.currentAttendees >= event.maxAttendees) {
      toast({
        title: "Evento lotado",
        description: "Não há mais vagas disponíveis para este evento.",
        variant: "destructive"
      });
      return;
    }

    try {
      const sessionId = getSessionId();
      const { error } = await supabase
        .from('event_confirmations')
        .insert([{
          event_id: parseInt(eventId),
          session_id: sessionId
        }]);
      
      if (error) throw error;
      
      // Atualizar contador de participantes
      const { error: updateError } = await supabase
        .from('events')
        .update({ current_attendees: (event.currentAttendees + 1) })
        .eq('id', parseInt(eventId));
      
      if (updateError) throw updateError;
      
      setConfirmedEvents(prev => [...prev, eventId]);
      
      // Atualizar lista de eventos
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, currentAttendees: e.currentAttendees + 1 }
          : e
      ));
      
      toast({
        title: "Presença confirmada!",
        description: `Você confirmou presença no evento: ${event?.title}`,
      });
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar presença.",
        variant: "destructive"
      });
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    
    try {
      const sessionId = getSessionId();
      const { error } = await supabase
        .from('event_confirmations')
        .delete()
        .eq('event_id', parseInt(eventId))
        .eq('session_id', sessionId);
      
      if (error) throw error;
      
      // Atualizar contador de participantes
      const { error: updateError } = await supabase
        .from('events')
        .update({ current_attendees: Math.max(0, event!.currentAttendees - 1) })
        .eq('id', parseInt(eventId));
      
      if (updateError) throw updateError;
      
      setConfirmedEvents(prev => prev.filter(id => id !== eventId));
      
      // Atualizar lista de eventos
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, currentAttendees: Math.max(0, e.currentAttendees - 1) }
          : e
      ));
      
      toast({
        title: "Presença cancelada",
        description: `Você cancelou sua presença no evento: ${event?.title}`,
      });
    } catch (error) {
      console.error('Erro ao cancelar presença:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar presença.",
        variant: "destructive"
      });
    }
  };

  const confirmedEventsList = events.filter(event => 
    confirmedEvents.includes(event.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-2 leading-tight">Agenda de Eventos</h1>
              <p className="text-xs sm:text-sm lg:text-lg opacity-90 leading-relaxed">Descubra e confirme presença nos melhores eventos</p>
            </div>
            <div className="flex flex-row gap-2 shrink-0">
              <Link to="/admin/import">
                <Button variant="ghost" size="sm" className="w-auto text-primary-foreground hover:bg-white/20 px-2 sm:px-3">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Import</span>
                </Button>
              </Link>
              <Link to="/admin/confirmations">
                <Button variant="ghost" size="sm" className="w-auto text-primary-foreground hover:bg-white/20 px-2 sm:px-3">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Admin</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs sm:max-w-sm mx-auto mb-4 sm:mb-6 lg:mb-8 h-9 sm:h-10">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-1.5 sm:px-2 lg:px-4">
              <span className="hidden sm:inline">Todos</span>
              <span className="sm:hidden">Todos</span>
              <span className="ml-0.5 sm:ml-1">({events.length})</span>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs sm:text-sm px-1.5 sm:px-2 lg:px-4">
              <span className="hidden sm:inline">Meus</span>
              <span className="sm:hidden">Meus</span>
              <span className="ml-0.5 sm:ml-1">({confirmedEventsList.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-1 sm:mb-2">Todos os Eventos</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Explore nossa seleção completa de eventos</p>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando eventos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {events.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isConfirmed={confirmedEvents.includes(event.id)}
                    onConfirm={handleConfirmEvent}
                    onCancel={handleCancelEvent}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="confirmed" className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-1 sm:mb-2">Meus Eventos</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {confirmedEventsList.length > 0 
                  ? "Eventos que você confirmou presença" 
                  : "Você ainda não confirmou presença em nenhum evento"
                }
              </p>
            </div>
            
            {confirmedEventsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {confirmedEventsList.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isConfirmed={true}
                    onConfirm={handleConfirmEvent}
                    onCancel={handleCancelEvent}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl sm:text-4xl">📅</span>
                </div>
                <p className="text-sm sm:text-lg text-muted-foreground mb-1 sm:mb-2">Nenhum evento confirmado</p>
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  Visite a aba "Todos os Eventos" para confirmar sua presença
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
