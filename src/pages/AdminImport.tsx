import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import Papa from "papaparse";

export default function AdminImport() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv") {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = results.meta.fields || [];
          const requiredHeaders = ['Dia', 'Horário', 'Sessão', 'Tema', 'Código Artigo', 'Artigo', 'Autores', 'EMAIL'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

          if (missingHeaders.length > 0) {
            toast({
              title: "Erro no formato",
              description: `Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`,
              variant: "destructive"
            });
            setIsUploading(false);
            return;
          }

          const events = results.data.map((event: any) => ({
            title: event['Artigo'] || 'Evento sem título',
            description: event['Autores'] || null,
            date: event['Dia'],
            time: event['Horário'],
            location: event['Sessão'] || 'Local não definido',
            session_name: event['Sessão'],
            theme: event['Tema'],
            article_code: event['Código Artigo'],
            authors: event['Autores'],
            contact_email: event['EMAIL'],
            max_attendees: 50,
            current_attendees: 0,
            image_url: null,
            price: null
          }));

          const { error } = await supabase.from('events').insert(events);

          if (error) {
            console.error('Erro ao inserir eventos:', error);
            toast({
              title: "Erro",
              description: "Erro ao importar eventos. Verifique o formato do arquivo.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Sucesso!",
              description: `${events.length} eventos importados com sucesso.`,
            });
            event.target.value = '';
          }
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          toast({
            title: "Erro",
            description: "Erro ao processar o arquivo CSV.",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        console.error('Erro no PapaParse:', err);
        toast({
          title: "Erro",
          description: "Erro ao ler o arquivo CSV.",
          variant: "destructive"
        });
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* <div className="bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Importar Eventos</h1>
          <p className="text-sm sm:text-base lg:text-lg opacity-90">Importe eventos em lote através de um arquivo CSV</p>
        </div>
      </div> */}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Arquivo CSV
              </CardTitle>
              <CardDescription>
                Selecione um arquivo CSV com os dados dos eventos para importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="csv-file">Arquivo CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="mt-2"
                />
              </div>

              {isUploading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Importando eventos...</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4 lg:mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Formato do Arquivo
              </CardTitle>
              <CardDescription>
                O arquivo CSV deve conter as seguintes colunas obrigatórias:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 lg:p-4 rounded-lg overflow-x-auto">
                <code className="text-xs sm:text-sm whitespace-nowrap">
                  Dia,Horário,Sessão,Tema,Código Artigo,Artigo,Autores,EMAIL
                </code>
              </div>
              <div className="mt-4 space-y-2 text-xs sm:text-sm text-muted-foreground">
                <p><strong>Dia:</strong> Data do evento (formato: DD/MM/AAAA ou AAAA-MM-DD)</p>
                <p><strong>Horário:</strong> Horário no formato HH:MM</p>
                <p><strong>Sessão:</strong> Nome da sessão ou local do evento</p>
                <p><strong>Tema:</strong> Tema ou categoria do evento</p>
                <p><strong>Código Artigo:</strong> Código de referência do artigo</p>
                <p><strong>Artigo:</strong> Título do artigo/apresentação</p>
                <p><strong>Autores:</strong> Nomes dos autores</p>
                <p><strong>EMAIL:</strong> Email de contato (opcional)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
