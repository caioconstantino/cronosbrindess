import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminAuth from "./pages/admin/AdminAuth";
import Dashboard from "./pages/admin/Dashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import Produtos from "./pages/admin/Produtos";
import Categorias from "./pages/admin/Categorias";
import Banners from "./pages/admin/Banners";
import Pedidos from "./pages/admin/Pedidos";
import EditarPedido from "./pages/admin/EditarPedido";
import CriarPedido from "./pages/admin/CriarPedido";
import Clientes from "./pages/admin/Clientes";
import SiteClients from "./pages/admin/SiteClients";
import Usuarios from "./pages/admin/Usuarios";
import Permissoes from "./pages/admin/Permissoes";
import EmailSettings from "./pages/admin/EmailSettings";
import EmailTemplates from "./pages/admin/EmailTemplates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/produtos/:id" element={<ProductDetail />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin/auth" element={<AdminAuth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="pedidos/novo" element={<CriarPedido />} />
            <Route path="pedidos/:id/editar" element={<EditarPedido />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="configuracoes/banners" element={<Banners />} />
            <Route path="configuracoes/clientes" element={<SiteClients />} />
            <Route path="configuracoes/email" element={<EmailSettings />} />
            <Route path="configuracoes/email/templates" element={<EmailTemplates />} />
            <Route path="configuracoes/permissoes" element={<Permissoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
