import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Calendar, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Confirmation {
  id: string;
  user_session_id: string;
  event_id: string;
  confirmed_at: string;
  events: {
    title: string;
    date: string;
    time: string;
    location: string;
  };
}

const AdminConfirmations = () => {
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfirmations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_confirmations')
        .select(`
          id,
          session_id,
          event_id,
          confirmed_at,
          events (
            title,
            date,
            time,
            location,
            session_name
          )
        `)
        .order('confirmed_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedConfirmations: Confirmation[] = data.map(item => ({
        id: item.id,
        user_session_id: item.session_id,
        event_id: item.event_id.toString(),
        confirmed_at: item.confirmed_at,
        events: {
          title: item.events?.title || 'Evento não encontrado',
          date: item.events?.date || '',
          time: item.events?.time || '',
          location: item.events?.session_name || item.events?.location || ''
        }
      }));
      
      setConfirmations(formattedConfirmations);
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar confirmações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConfirmation = async (confirmationId: string) => {
    try {
      const confirmation = confirmations.find(c => c.id === confirmationId);
      if (!confirmation) return;
      
      // Deletar confirmação
      const { error } = await supabase
        .from('event_confirmations')
        .delete()
        .eq('id', confirmationId);
      
      if (error) throw error;
      
      // Buscar contador atual e atualizar
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('current_attendees')
        .eq('id', parseInt(confirmation.event_id))
        .single();
      
      if (eventError) throw eventError;
      
      const newCount = Math.max(0, (eventData.current_attendees || 0) - 1);
      const { error: updateError } = await supabase
        .from('events')
        .update({ current_attendees: newCount })
        .eq('id', parseInt(confirmation.event_id));
      
      if (updateError) throw updateError;
      
      toast({
        title: "Sucesso",
        description: "Confirmação deletada com sucesso.",
      });
      fetchConfirmations(); // Recarregar a lista
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar confirmação.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchConfirmations();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('pt-BR');
  };

  const getUniqueUsers = () => {
    return new Set(confirmations.map(c => c.user_session_id)).size;
  };

  const getUniqueEvents = () => {
    return new Set(confirmations.map(c => c.event_id)).size;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Confirmações de Presença</h1>
          <p className="text-sm sm:text-base lg:text-lg opacity-90">Visualize todas as confirmações de eventos</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Confirmações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmations.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueUsers()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos com Confirmações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueEvents()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Confirmations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Confirmações</CardTitle>
            <CardDescription>
              Todas as confirmações de presença registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando confirmações...</span>
              </div>
            ) : confirmations.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Evento</TableHead>
                      <TableHead className="min-w-[120px]">Data do Evento</TableHead>
                      <TableHead className="min-w-[120px] hidden lg:table-cell">Local</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">ID do Usuário</TableHead>
                      <TableHead className="min-w-[120px] hidden sm:table-cell">Confirmado em</TableHead>
                      <TableHead className="w-[60px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confirmations.map((confirmation) => (
                      <TableRow key={confirmation.id}>
                        <TableCell className="font-medium">
                          {confirmation.events?.title || 'Evento não encontrado'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{formatDate(confirmation.events?.date || '')}</span>
                            <span className="text-xs text-muted-foreground">
                              {confirmation.events?.time}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{confirmation.events?.location}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-mono text-xs">
                            {confirmation.user_session_id.substring(0, 8)}...
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{formatDateTime(confirmation.confirmed_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteConfirmation(confirmation.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-32 h-32 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Users className="text-4xl text-muted-foreground" />
                </div>
                <p className="text-lg text-muted-foreground mb-2">Nenhuma confirmação encontrada</p>
                <p className="text-sm text-muted-foreground">
                  As confirmações aparecerão aqui quando os usuários confirmarem presença
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminConfirmations;