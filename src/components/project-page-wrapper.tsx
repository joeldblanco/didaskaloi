"use client";

import { useEffect, useState, ReactNode } from "react";
import { useProject } from "@/contexts/project-context";
import { getUserProjects } from "@/lib/project-actions";
import { ProjectSelector } from "@/components/project-selector";

type Props = {
  children: ReactNode;
  title: string;
};

export function ProjectPageWrapper({ children, title }: Props) {
  const { activeProjectId } = useProject();
  const [projects, setProjects] = useState<Array<{ id: number; name: string; role: string }>>([]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const userProjects = await getUserProjects();
        setProjects(userProjects.map(p => ({ id: p.id, name: p.name, role: p.role || "VIEWER" })));
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    loadProjects();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      {projects.length > 0 && (
        <div className="mb-4">
          <ProjectSelector projects={projects} />
        </div>
      )}

      {!activeProjectId ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Selecciona un proyecto para continuar
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
