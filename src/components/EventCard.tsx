import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: string;
  maxAttendees: number;
  currentAttendees: number;
  // Novos campos do CSV
  session_name?: string;
  theme?: string;
  article_code?: string;
  authors?: string;
  contact_email?: string;
  sala?: string;
}

interface EventCardProps {
  event: Event;
  isConfirmed: boolean;
  onConfirm: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}

export const EventCard = ({ event, isConfirmed, onConfirm, onCancel }: EventCardProps) => {
  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('pt-BR', {
  //     weekday: 'short',
  //     day: '2-digit',
  //     month: 'short'
  //   });
  // };
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-"); // pega direto a string vinda do Supabase
    return format(new Date(+year, +month - 1, +day), "EEE, dd 'de' MMM", { locale: ptBR });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Palestras Magnas': 'bg-blue-100 text-blue-800 border-blue-200',
      'Seminários': 'bg-purple-100 text-purple-800 border-purple-200',
      'Apresentação de artigos - orais': 'bg-green-100 text-green-800 border-green-200',
      'Apresentação de artigos - posters': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Cursos': 'bg-pink-100 text-pink-800 border-pink-200',
      'Concursos': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card className="bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300 hover:scale-[1.02] border border-border/50">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground line-clamp-2 leading-tight">
            {event.title}
          </CardTitle>
          <Badge
            className={`${getCategoryColor(event.theme || event.category)} border text-xs shrink-0`}
          >
            {(event.theme || event.category)?.length > 10
              ? (event.theme || event.category).slice(0, 10) + "..."
              : event.theme || event.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 leading-relaxed">
          {event.authors || event.description}
        </p>
        
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="truncate">{formatDate(event.date)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="truncate">{event.time}</span>
          </div>
          
          {(event.session_name || event.location) && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="line-clamp-1 min-w-0">
                {event.session_name || event.location}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="truncate">sala - {event.sala ? event.sala : 'não informada'}</span>
          </div>
          
          {event.article_code && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="text-primary">📄</span>
              <span className="truncate font-mono">{event.article_code}</span>
            </div>
          )}
        </div>
        
        <div className="pt-1 sm:pt-2">
          {isConfirmed ? (
            <Button 
              variant="outline" 
              className="w-full h-9 sm:h-10 text-xs sm:text-sm font-medium"
              onClick={() => onCancel(event.id)}
            >
              Cancelar Presença
            </Button>
          ) : (
            <Button 
              variant="confirm" 
              className="w-full h-9 sm:h-10 text-xs sm:text-sm font-medium"
              onClick={() => onConfirm(event.id)}
              disabled={event.currentAttendees >= event.maxAttendees}
            >
              {event.currentAttendees >= event.maxAttendees ? 'Evento Lotado' : 'Confirmar Presença'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};