import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, CheckCircle, XCircle, Clock, Search, RefreshCw, Eye, FileText } from "lucide-react";

interface EmailLog {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_by_name: string | null;
  order_id: string | null;
  body_html: string | null;
  attachment_url: string | null;
}

function EmailStatsCards({ logs }: { logs: EmailLog[] | undefined }) {
  const stats = {
    total: logs?.length || 0,
    sent: logs?.filter((l) => l.status === "sent").length || 0,
    failed: logs?.filter((l) => l.status === "failed").length || 0,
    pending: logs?.filter((l) => l.status === "pending").length || 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Enviados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{stats.sent}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Falhas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="text-2xl font-bold text-destructive">{stats.failed}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats.pending}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailDetailDialog({ log, open, onOpenChange }: { log: EmailLog | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Detalhes do Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Destinatário:</span>
              <p>{log.recipient_email}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Data/Hora:</span>
              <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Assunto:</span>
              <p>{log.subject}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Enviado por:</span>
              <p>{log.sent_by_name || "-"}</p>
            </div>
          </div>

          {log.error_message && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <strong>Erro:</strong> {log.error_message}
            </div>
          )}

          {log.attachment_url && (
            <div>
              <span className="font-medium text-muted-foreground text-sm">PDF Anexo:</span>
              <div className="mt-1">
                <Button variant="outline" size="sm" asChild>
                  <a href={log.attachment_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" /> Visualizar PDF
                  </a>
                </Button>
              </div>
            </div>
          )}

          {log.body_html ? (
            <div>
              <span className="font-medium text-muted-foreground text-sm">Corpo do Email:</span>
              <div
                className="mt-2 border rounded-md p-4 bg-background overflow-auto max-h-[400px]"
                dangerouslySetInnerHTML={{ __html: log.body_html }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Corpo do email não disponível (emails anteriores à atualização)</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" /> Enviado
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> Falhou
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" /> Pendente
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function EmailLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["email-logs", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("sent_email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.recipient_email?.toLowerCase().includes(term) ||
      log.subject?.toLowerCase().includes(term) ||
      log.sent_by_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Email</h1>
          <p className="text-muted-foreground">Acompanhe todos os emails enviados pelo sistema</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <EmailStatsCards logs={logs} />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, assunto ou remetente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Enviado por</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">{log.recipient_email}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{log.subject}</TableCell>
                    <TableCell className="text-sm">{log.sent_by_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4" />
              <p>Nenhum email encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EmailDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </div>
  );
}
