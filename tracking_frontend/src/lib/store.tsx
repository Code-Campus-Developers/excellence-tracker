import { createContext, useContext, useState, type ReactNode } from "react";
import { EVALUATIONS, STUDENTS, type Evaluation, type Student } from "./tracking";

interface Store {
  evaluations: Evaluation[];
  addEvaluation: (e: Evaluation) => void;
  students: Student[];
  addStudent: (s: Student) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(EVALUATIONS);
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const addEvaluation = (e: Evaluation) =>
    setEvaluations((prev) => [...prev, e]);
  const addStudent = (s: Student) =>
    setStudents((prev) => [...prev, s]);
  return (
    <StoreContext.Provider value={{ evaluations, addEvaluation, students, addStudent }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
