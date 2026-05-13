import type { Task } from "../types";

export function sortTasksForPlanner(tasks: Task[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aOrder = a.task.plannerOrder ?? a.index;
      const bOrder = b.task.plannerOrder ?? b.index;
      return aOrder === bOrder ? a.index - b.index : aOrder - bOrder;
    })
    .map(({ task }) => task);
}

export function applyTaskOrder(tasks: Task[], orderedIds: string[]): Task[] {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]));
  return tasks.map((task) => {
    const plannerOrder = orderById.get(task.id);
    return plannerOrder === undefined ? task : { ...task, plannerOrder };
  });
}

export function nextPlannerOrder(tasks: Task[], date: string): number {
  return tasks.reduce((max, task, index) => {
    if (task.date !== date) return max;
    return Math.max(max, task.plannerOrder ?? index);
  }, -1) + 1;
}
