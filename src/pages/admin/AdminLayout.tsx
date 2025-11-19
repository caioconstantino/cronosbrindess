import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Layers, ShoppingCart, Users, Settings, Image, Building2, UserCog, Shield } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, resource: "dashboard" },
  { name: "Produtos", href: "/admin/produtos", icon: Package, resource: "produtos" },
  { name: "Categorias", href: "/admin/categorias", icon: Layers, resource: "categorias" },
  { name: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart, resource: "pedidos" },
  { name: "Clientes", href: "/admin/clientes", icon: Users, resource: "clientes" },
  { name: "Usuários", href: "/admin/usuarios", icon: UserCog, resource: "usuarios" },
];

const settingsNavigation = [
  { name: "Banners", href: "/admin/configuracoes/banners", icon: Image, resource: "banners" },
  { name: "Clientes", href: "/admin/configuracoes/clientes", icon: Building2, resource: "site_clientes" },
  { name: "Permissões", href: "/admin/configuracoes/permissoes", icon: Shield, resource: "usuarios" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { canAccess, loading: permissionsLoading } = usePermissions();
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        navigate("/admin/auth");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation
                .filter((item) => isAdmin || canAccess(item.resource))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}

              {(isAdmin || settingsNavigation.some(item => canAccess(item.resource))) && (
                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-muted w-full">
                    <Settings className="h-5 w-5" />
                    <span className="flex-1 text-left">Configurações do Site</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-4 mt-1">
                    {settingsNavigation
                      .filter((item) => isAdmin || canAccess(item.resource))
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        );
                      })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </nav>
          </aside>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
