import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminAuth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a nova página de login unificada
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
}
