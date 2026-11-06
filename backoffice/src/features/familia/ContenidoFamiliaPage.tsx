// ========================================
// PANTALLA: ContenidoFamiliaPage
// DESCRIPCIÓN:
// Lo que el personal publica para las familias: avisos (con confirmación de
// lectura), eventos con inscripción, documentos generales y álbumes de
// fotos. Las noticias se cargan desde Novedades marcando "También para las
// familias".
// ========================================
import { useSearchParams } from 'react-router-dom';
import { Bell, CalendarDays, FileText, Images } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvisosTab } from './AvisosTab';
import { DocumentosTab } from './DocumentosTab';
import { EventosTab } from './EventosTab';
import { FotosTab } from './FotosTab';

const TABS = ['avisos', 'eventos', 'documentos', 'fotos'] as const;
type Tab = (typeof TABS)[number];

export function ContenidoFamiliaPage() {
  const [params, setParams] = useSearchParams();
  const pedida = params.get('tab');
  const tab: Tab = TABS.includes(pedida as Tab) ? (pedida as Tab) : 'avisos';

  return (
    <div className="space-y-5">
      <PageHeader titulo="Contenido para familias" descripcion="Avisos, eventos, documentos y fotos que ven los familiares en su app. Las noticias se cargan en Novedades." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="avisos" className="gap-1.5"><Bell className="h-4 w-4" /> Avisos</TabsTrigger>
          <TabsTrigger value="eventos" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Eventos</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-1.5"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
          <TabsTrigger value="fotos" className="gap-1.5"><Images className="h-4 w-4" /> Fotos</TabsTrigger>
        </TabsList>
        <TabsContent value="avisos"><AvisosTab /></TabsContent>
        <TabsContent value="eventos"><EventosTab /></TabsContent>
        <TabsContent value="documentos"><DocumentosTab /></TabsContent>
        <TabsContent value="fotos"><FotosTab /></TabsContent>
      </Tabs>
    </div>
  );
}
