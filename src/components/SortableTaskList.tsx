import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";
import { TaskRow } from "./TaskRow";

export function SortableTaskList({
  tasks,
  onOrderChange,
  onToggle,
  onSelect,
  onMenu,
}: {
  tasks: Task[];
  onOrderChange: (orderedIds: string[]) => void;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onMenu?: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = tasks.map((task) => task.id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onOrderChange(arrayMove(tasks, oldIndex, newIndex).map((task) => task.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskItem
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onSelect={() => onSelect(task.id)}
            onMenu={onMenu ? () => onMenu(task.id) : undefined}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskItem({
  task,
  onToggle,
  onSelect,
  onMenu,
}: {
  task: Task;
  onToggle: () => void;
  onSelect: () => void;
  onMenu?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className="border-b last:border-b-0"
      style={{
        borderColor: "var(--border-soft)",
        opacity: isDragging ? 0.65 : 1,
        position: "relative",
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <TaskRow task={task} onToggle={onToggle} onSelect={onSelect} onMenu={onMenu} showBorder={false} />
    </div>
  );
}
