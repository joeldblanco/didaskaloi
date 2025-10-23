"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ProjectContextType = {
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;
  activeProjectName: string | null;
  setActiveProjectName: (name: string | null) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [activeProjectName, setActiveProjectNameState] = useState<string | null>(null);

  useEffect(() => {
    // Cargar de localStorage al montar
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("activeProjectId");
      const storedName = localStorage.getItem("activeProjectName");
      
      if (storedId) {
        setActiveProjectIdState(parseInt(storedId));
      }
      if (storedName) {
        setActiveProjectNameState(storedName);
      }
    }
  }, []);

  const setActiveProjectId = (id: number | null) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id !== null) {
        localStorage.setItem("activeProjectId", id.toString());
      } else {
        localStorage.removeItem("activeProjectId");
      }
    }
  };

  const setActiveProjectName = (name: string | null) => {
    setActiveProjectNameState(name);
    if (typeof window !== "undefined") {
      if (name !== null) {
        localStorage.setItem("activeProjectName", name);
      } else {
        localStorage.removeItem("activeProjectName");
      }
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId,
        setActiveProjectId,
        activeProjectName,
        setActiveProjectName,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
