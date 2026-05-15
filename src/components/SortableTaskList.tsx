import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Task } from '../types';
import { TaskRow } from './TaskRow';

type SortableTaskListProps = {
  tasks: Task[];
  selectedIds?: string[];
  variant?: 'default' | 'list';
  subtaskTogglePlacement?: 'inline' | 'bottom-right';
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onMenu?: (id: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onEditSubtask?: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTransfer?: (id: string) => void;
  onSend?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  itemClassName?: string;
  itemStyle?: CSSProperties;
};

function SortableTaskItem({
  task,
  selectedIds = [],
  variant = 'default',
  subtaskTogglePlacement = 'inline',
  onToggle,
  onSelect,
  onMenu,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onEdit,
  onTransfer,
  onSend,
  onDelete,
  onCopy,
  itemClassName,
  itemStyle,
}: Omit<SortableTaskListProps, 'tasks' | 'onReorder'> & { task: Task }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={itemClassName}
      style={{
        ...itemStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <TaskRow
        task={task}
        variant={variant}
        selected={selectedIds.includes(task.id)}
        subtaskTogglePlacement={subtaskTogglePlacement}
        dragActivatorRef={setActivatorNodeRef}
        dragActivatorAttributes={attributes}
        dragActivatorListeners={listeners}
        onToggle={() => onToggle(task.id)}
        onSelect={() => onSelect(task.id)}
        onMenu={onMenu ? () => onMenu(task.id) : undefined}
        onToggleSubtask={(subtaskId) => onToggleSubtask?.(task.id, subtaskId)}
        onEditSubtask={(subtaskId) => onEditSubtask?.(task.id, subtaskId)}
        onDeleteSubtask={(subtaskId) => onDeleteSubtask?.(task.id, subtaskId)}
        onAddSubtask={onAddSubtask ? () => onAddSubtask(task.id) : undefined}
        onEdit={onEdit ? () => onEdit(task.id) : undefined}
        onTransfer={onTransfer ? () => onTransfer(task.id) : undefined}
        onSend={onSend ? () => onSend(task.id) : undefined}
        onDelete={onDelete ? () => onDelete(task.id) : undefined}
        onCopy={onCopy ? () => onCopy(task.id) : undefined}
      />
    </div>
  );
}

export function SortableTaskList({
  tasks,
  selectedIds = [],
  variant = 'default',
  subtaskTogglePlacement = 'inline',
  onToggle,
  onSelect,
  onMenu,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onEdit,
  onTransfer,
  onSend,
  onDelete,
  onCopy,
  onReorder,
  itemClassName,
  itemStyle,
}: SortableTaskListProps) {
  const taskIds = tasks.map((task) => task.id);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const renderTask = (task: Task) => (
    <div key={task.id} className={itemClassName} style={itemStyle}>
      <TaskRow
        task={task}
        variant={variant}
        selected={selectedIds.includes(task.id)}
        subtaskTogglePlacement={subtaskTogglePlacement}
        onToggle={() => onToggle(task.id)}
        onSelect={() => onSelect(task.id)}
        onMenu={onMenu ? () => onMenu(task.id) : undefined}
        onToggleSubtask={(subtaskId) => onToggleSubtask?.(task.id, subtaskId)}
        onEditSubtask={(subtaskId) => onEditSubtask?.(task.id, subtaskId)}
        onDeleteSubtask={(subtaskId) => onDeleteSubtask?.(task.id, subtaskId)}
        onAddSubtask={onAddSubtask ? () => onAddSubtask(task.id) : undefined}
        onEdit={onEdit ? () => onEdit(task.id) : undefined}
        onTransfer={onTransfer ? () => onTransfer(task.id) : undefined}
        onSend={onSend ? () => onSend(task.id) : undefined}
        onDelete={onDelete ? () => onDelete(task.id) : undefined}
        onCopy={onCopy ? () => onCopy(task.id) : undefined}
      />
    </div>
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = taskIds.indexOf(String(active.id));
    const newIndex = taskIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(taskIds, oldIndex, newIndex));
  };

  if (!onReorder || tasks.length < 2) return <>{tasks.map(renderTask)}</>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskItem
            key={task.id}
            task={task}
            selectedIds={selectedIds}
            variant={variant}
            subtaskTogglePlacement={subtaskTogglePlacement}
            onToggle={onToggle}
            onSelect={onSelect}
            onMenu={onMenu}
            onToggleSubtask={onToggleSubtask}
            onEditSubtask={onEditSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onAddSubtask={onAddSubtask}
            onEdit={onEdit}
            onTransfer={onTransfer}
            onSend={onSend}
            onDelete={onDelete}
            onCopy={onCopy}
            itemClassName={itemClassName}
            itemStyle={itemStyle}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
