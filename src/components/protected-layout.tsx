"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Lock } from "lucide-react";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate API verification delay
    setTimeout(() => {
      // Simple password check - in real app, use proper authentication
      if (password === process.env.NEXT_PUBLIC_PASSWORD) {
        localStorage.setItem("isAuthenticated", "true");
        setIsAuthenticated(true);
      } else {
        setError("Contraseña incorrecta");
      }
      setIsLoading(false);
    }, 800);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="bg-blue-500 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Lock className="text-white h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold">Didaskaloi</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Sistema de Gestión de Asistencia
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="w-full"
                  autoFocus
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!password || isLoading}
              >
                {isLoading ? "Verificando..." : "Acceder"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-xs text-gray-500">
              Contacta al administrador si necesitas acceso
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
