"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useProject } from "@/contexts/project-context";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncManager, SyncStatus } from "@/lib/sync-manager";
import { getUserProjects } from "@/lib/project-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  FolderOpen,
  User,
  RefreshCw,
  CheckCircle2,
  XCircle,
  WifiOff,
} from "lucide-react";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

type Project = {
  id: string;
  name: string;
  role: string;
};

export function SidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { activeProjectId, setActiveProjectId, setActiveProjectName } =
    useProject();
  const { isOnline } = useOnlineStatus();
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    progress: 0,
  });
  const [lastSyncResult, setLastSyncResult] = useState<
    "idle" | "success" | "error"
  >("idle");

  useEffect(() => {
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      setSyncStatus(status);
      if (!status.syncing && status.progress === 100) {
        setLastSyncResult("success");
      } else if (
        !status.syncing &&
        status.progress === 0 &&
        lastSyncResult !== "idle"
      ) {
        setLastSyncResult("error");
      }
    });
    return unsubscribe;
  }, [lastSyncResult]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const userProjects = await getUserProjects();
        setProjects(
          userProjects.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role || "VIEWER",
          })),
        );
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    loadProjects();
  }, []);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setActiveProjectId(projectId);
      setActiveProjectName(project.name);
      router.refresh();
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  // Don't show sidebar on auth pages or project selection pages
  if (pathname.startsWith("/auth") || pathname.startsWith("/proyectos")) {
    return null;
  }

  const navItems: NavItem[] = activeProjectId
    ? [
        { name: "Clases", path: "/clases", icon: <BookOpen size={20} /> },
        {
          name: "Estudiantes",
          path: "/estudiantes",
          icon: <Users size={20} />,
        },
        {
          name: "Asistencia",
          path: "/asistencia",
          icon: <CalendarCheck size={20} />,
        },
        { name: "Reportes", path: "/reportes", icon: <BarChart3 size={20} /> },
        {
          name: "Configuración",
          path: "/configuracion",
          icon: <Settings size={20} />,
        },
      ]
    : [];

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-semibold">Didaskaloi</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Gestión de asistencia
        </p>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {sessionStatus === "loading" ? (
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-sm font-medium leading-none truncate">
                {session?.user?.name || "Usuario"}
              </p>
            )}
            {sessionStatus === "loading" ? (
              <div className="h-3 w-32 bg-muted animate-pulse rounded mt-1" />
            ) : session?.user?.email ? (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {session.user.email}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-4 py-4 border-b border-border">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Proyecto activo
          </label>
          <Select
            value={activeProjectId || ""}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full mt-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.role === "ADMIN"
                        ? "Admin"
                        : project.role === "EDITOR"
                          ? "Editor"
                          : "Viewer"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (pathname === "/" && item.path === "/clases");
            return (
              <li key={item.name}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sync Status */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          {!isOnline ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="text-orange-500 font-medium">Sin conexión</span>
            </>
          ) : syncStatus.syncing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-blue-500 font-medium">
                  Sincronizando... {syncStatus.current}/{syncStatus.total}
                </span>
                <div className="w-full bg-blue-100 dark:bg-blue-900 h-1 mt-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${syncStatus.progress}%` }}
                  />
                </div>
              </div>
            </>
          ) : lastSyncResult === "error" ? (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="text-red-500 font-medium">
                Error de sincronización
              </span>
            </>
          ) : lastSyncResult === "success" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-green-500 font-medium">Sincronizado</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Conectado</span>
            </>
          )}
        </div>
      </div>

      {/* Sign Out */}
      <div className="px-4 py-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
