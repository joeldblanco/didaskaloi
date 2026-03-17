"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useProject } from "@/contexts/project-context";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncManager, SyncStatus } from "@/lib/sync-manager";
import { getUserProjects } from "@/lib/project-actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  LogOut,
  Mail,
  User,
  RefreshCw,
  CheckCircle2,
  XCircle,
  WifiOff,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  role: string;
};

type AppSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppSheet({ open, onOpenChange }: AppSheetProps) {
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
      } else if (!status.syncing && status.progress === 0 && lastSyncResult !== "idle") {
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
          }))
        );
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    if (open) {
      loadProjects();
    }
  }, [open]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setActiveProjectId(projectId);
      setActiveProjectName(project.name);
      router.refresh();
      onOpenChange(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Didaskaloi</SheetTitle>
          <SheetDescription>Gestión de proyectos y cuenta</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          {/* Sync Status Indicator */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-sm">
              {!isOnline ? (
                <>
                  <WifiOff className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="text-orange-500 font-medium">Sin conexi\u00f3n</span>
                </>
              ) : syncStatus.syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
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
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-red-500 font-medium">Error de sincronizaci\u00f3n</span>
                </>
              ) : lastSyncResult === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-green-500 font-medium">Sincronizado</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Conectado</span>
                </>
              )}
            </div>
          </div>

          {/* User Account Widget */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {sessionStatus === "loading" ? (
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-sm font-medium leading-none truncate">
                    {session?.user?.name || "Usuario"}
                  </p>
                )}
              </div>
            </div>
            {sessionStatus === "loading" ? (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : session?.user?.email ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{session.user.email}</span>
              </div>
            ) : null}
          </div>

          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Proyecto activo
              </label>
              <Select
                value={activeProjectId || ""}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="w-full">
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
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
