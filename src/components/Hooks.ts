import { useEffect, useState } from "react";
import { storage } from "../lib/storage";
import type { Task, Note } from "../types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => { storage.seed(); setTasks(storage.getTasks()); }, []);
  const save = (t: Task[]) => { setTasks(t); storage.setTasks(t); };
  return { tasks, save };
}
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => { setNotes(storage.getNotes()); }, []);
  const save = (n: Note[]) => { setNotes(n); storage.setNotes(n); };
  return { notes, save };
}
