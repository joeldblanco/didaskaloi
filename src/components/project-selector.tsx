"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen } from "lucide-react";

type Project = {
  id: number;
  name: string;
  role: string;
};

type Props = {
  projects: Project[];
};

export function ProjectSelector({ projects }: Props) {
  const router = useRouter();
  const { activeProjectId, setActiveProjectId, setActiveProjectName } = useProject();

  // Si hay proyectos pero no hay uno activo, seleccionar el primero
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      const firstProject = projects[0];
      setActiveProjectId(firstProject.id);
      setActiveProjectName(firstProject.name);
    }
  }, [projects, activeProjectId, setActiveProjectId, setActiveProjectName]);

  const handleProjectChange = (projectId: string) => {
    const id = parseInt(projectId);
    const project = projects.find((p) => p.id === id);
    
    if (project) {
      setActiveProjectId(id);
      setActiveProjectName(project.name);
      router.refresh();
    }
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <Select
      value={activeProjectId?.toString() || ""}
      onValueChange={handleProjectChange}
    >
      <SelectTrigger className="w-64">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <SelectValue placeholder="Seleccionar proyecto" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id.toString()}>
            <div className="flex items-center justify-between w-full gap-4">
              <span>{project.name}</span>
              <span className="text-xs text-gray-500">
                {project.role === "ADMIN" ? "Admin" : project.role === "EDITOR" ? "Editor" : "Viewer"}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
