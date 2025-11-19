import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Phone, Mail, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoCronos from "@/assets/logo-cronos.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  cartItemsCount?: number;
}

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type Product = {
  id: string;
  name: string;
  image_url: string | null;
};

export const Header = ({ cartItemsCount = 0 }: HeaderProps) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, image_url")
      .eq("active", true)
      .ilike("name", `%${searchQuery}%`)
      .limit(5);
    
    if (data) {
      setSuggestions(data);
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, parent_id")
      .order("name");
    
    if (data) setCategories(data);
  };

  const getMainCategories = () => {
    return categories.filter((cat) => !cat.parent_id);
  };

  const getSubcategories = (parentId: string) => {
    return categories.filter((cat) => cat.parent_id === parentId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produtos?search=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setSearchQuery("");
    }
  };

  const handleSuggestionClick = (productId: string) => {
    navigate(`/produtos/${productId}`);
    setShowSuggestions(false);
    setSearchQuery("");
  };

  return (
    <header className="border-b bg-background shadow-elegant sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      {/* Top Bar - Hidden on mobile */}
      <div className="bg-gradient-hero text-primary-foreground hidden md:block">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <a href="tel:+551126133882" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Phone className="h-4 w-4" />
                <span className="font-medium">+55 11 2613-3882</span>
              </a>
              <a href="mailto:contato@loja.com.br" className="flex items-center gap-2 hover:text-accent transition-colors">
                <Mail className="h-4 w-4" />
                <span className="font-medium">contato@loja.com.br</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-background border-b border-border/50">
        <div className="container mx-auto px-4 py-3 md:py-5">
          <div className="flex items-center justify-between gap-2 md:gap-8">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-background">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Contact Info */}
                  <div className="space-y-3 pb-4 border-b">
                    <a href="tel:+551126133882" className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>+55 11 2613-3882</span>
                    </a>
                    <a href="mailto:contato@loja.com.br" className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>contato@loja.com.br</span>
                    </a>
                  </div>
                  
                  {/* Categories */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">CATEGORIAS</h3>
                    {getMainCategories().map((category) => {
                      const subcategories = getSubcategories(category.id);
                      return (
                        <div key={category.id} className="space-y-1">
                          <Link
                            to={`/produtos?categoria=${category.id}`}
                            className="block py-2 font-medium hover:text-primary transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {category.name}
                          </Link>
                          {subcategories.length > 0 && (
                            <div className="pl-4 space-y-1">
                              {subcategories.map((sub) => (
                                <Link
                                  key={sub.id}
                                  to={`/produtos?categoria=${sub.id}`}
                                  className="block py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <img src={logoCronos} alt="Cronos Brindes & Camisetas" className="h-8 md:h-12 w-auto object-contain" />
            </Link>

            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative" ref={searchRef}>
              <div className="relative group w-full">
                <Input
                  type="text"
                  placeholder="Digite o brinde que você procura..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                  className="w-full pr-12 h-12 bg-muted border-transparent focus:border-primary transition-all rounded-xl shadow-sm"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1 top-1 h-10 w-10 bg-gradient-hero hover:opacity-90 transition-all rounded-lg shadow-md"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-xl shadow-elegant z-[150] max-h-96 overflow-y-auto">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSuggestionClick(product.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{product.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Mobile Search Button */}
              <Link to="/produtos" className="md:hidden">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Search className="h-5 w-5" />
                </Button>
              </Link>

              <Link to="/carrinho">
                <Button variant="ghost" size="icon" className="relative hover:bg-muted rounded-xl transition-all h-10 w-10 md:h-11 md:w-11">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-accent text-accent-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold shadow-md">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Bar - Hidden on mobile */}
      <div className="bg-muted/50 border-b border-border/30 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            <DropdownMenu open={openDropdown === 'all'} onOpenChange={(open) => setOpenDropdown(open ? 'all' : null)}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 font-semibold hover:bg-background/80 rounded-xl transition-all h-10"
                  onMouseEnter={() => setOpenDropdown('all')}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  TODAS AS CATEGORIAS
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-72 bg-popover z-[100] shadow-elegant rounded-xl border-border/50 max-h-[70vh] overflow-y-auto"
                onMouseEnter={() => setOpenDropdown('all')}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {getMainCategories().map((category) => (
                  <DropdownMenuItem key={category.id} asChild>
                    <Link to={`/produtos?categoria=${category.id}`} className="w-full font-medium cursor-pointer text-foreground hover:text-primary hover:bg-accent">
                      {category.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {getMainCategories().slice(0, 6).map((category) => {
              const subcategories = getSubcategories(category.id);
              
              if (subcategories.length > 0) {
                return (
                  <DropdownMenu 
                    key={category.id}
                    open={openDropdown === category.id}
                    onOpenChange={(open) => setOpenDropdown(open ? category.id : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="px-4 py-2 h-10 text-sm font-semibold hover:bg-background/80 rounded-xl transition-all whitespace-nowrap gap-1.5"
                        onMouseEnter={() => setOpenDropdown(category.id)}
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        {category.name.toUpperCase()}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="bg-popover z-[100] shadow-elegant rounded-xl border-border/50 w-56"
                      onMouseEnter={() => setOpenDropdown(category.id)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <DropdownMenuItem asChild>
                        <Link to={`/produtos?categoria=${category.id}`} className="font-semibold text-primary cursor-pointer hover:bg-accent">
                          Ver Todos
                        </Link>
                      </DropdownMenuItem>
                      {subcategories.map((sub) => (
                        <DropdownMenuItem key={sub.id} asChild>
                          <Link to={`/produtos?categoria=${sub.id}`} className="pl-6 cursor-pointer text-foreground hover:text-primary hover:bg-accent">
                            {sub.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              return (
                <Link
                  key={category.id}
                  to={`/produtos?categoria=${category.id}`}
                  className="px-4 py-2 h-10 flex items-center text-sm font-semibold hover:bg-background/80 rounded-xl transition-all whitespace-nowrap"
                >
                  {category.name.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
