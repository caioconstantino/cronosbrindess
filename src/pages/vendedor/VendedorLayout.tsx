import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";
import { Users, ShoppingCart } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Meus Clientes", href: "/vendedor/clientes", icon: Users },
  { name: "Pedidos", href: "/vendedor/pedidos", icon: ShoppingCart },
];

export default function VendedorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isVendedor, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || !isVendedor) {
        navigate("/admin/auth");
      }
    }
  }, [user, isVendedor, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isVendedor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
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
