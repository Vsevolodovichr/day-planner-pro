import {
  ArrowRightLeft,
  Copy,
  GripVertical,
  ListPlus,
  Pencil,
  Send,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Task } from '../types';
import { taskText } from '../lib/task-utils';

const SWIPE_THRESHOLD = 88;
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_MAX_ACTION_WIDTH = 240;
const SWIPE_OPEN_EVENT = 'day-planner-task-swipe-open';
const SWIPE_CLOSE_EVENT = 'day-planner-task-swipe-close';

type SwipeAction = {
  key: string;
  label: string;
  Icon: LucideIcon;
  tone?: 'default' | 'danger';
  onClick: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function actionStyle(key: string, tone: SwipeAction['tone']) {
  if (tone === 'danger') {
    return {
      background:
        'linear-gradient(180deg, rgba(92, 24, 24, 0.96) 0%, rgba(48, 10, 10, 0.98) 100%)',
      color: '#FFD6D6',
      borderLeft: '1px solid rgba(255, 120, 120, 0.22)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45)',
    };
  }

  if (key === 'subtask') {
    return {
      background:
        'linear-gradient(180deg, rgba(28, 52, 45, 0.96) 0%, rgba(12, 24, 21, 0.98) 100%)',
      color: '#BDEDDC',
      borderLeft: '1px solid rgba(151, 231, 203, 0.16)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.5)',
    };
  }

  if (key === 'edit') {
    return {
      background:
        'linear-gradient(180deg, rgba(71, 54, 23, 0.96) 0%, rgba(28, 20, 8, 0.98) 100%)',
      color: '#F3D48A',
      borderLeft: '1px solid rgba(243, 212, 138, 0.2)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)',
    };
  }

  if (key === 'transfer') {
    return {
      background:
        'linear-gradient(180deg, rgba(52, 48, 38, 0.96) 0%, rgba(22, 20, 16, 0.98) 100%)',
      color: '#D9C5A1',
      borderLeft: '1px solid rgba(217, 197, 161, 0.16)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.5)',
    };
  }

  if (key === 'send') {
    return {
      background:
        'linear-gradient(180deg, rgba(38, 51, 49, 0.96) 0%, rgba(15, 22, 21, 0.98) 100%)',
      color: '#B9DDD7',
      borderLeft: '1px solid rgba(185, 221, 215, 0.14)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.5)',
    };
  }

  if (key === 'copy') {
    return {
      background:
        'linear-gradient(180deg, rgba(45, 42, 52, 0.96) 0%, rgba(18, 16, 22, 0.98) 100%)',
      color: '#D7C9F2',
      borderLeft: '1px solid rgba(215, 201, 242, 0.14)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.5)',
    };
  }

  return {
    background:
      'linear-gradient(180deg, rgba(57, 43, 21, 0.96) 0%, rgba(20, 15, 8, 0.98) 100%)',
    color: '#E8C978',
    borderLeft: '1px solid rgba(232, 201, 120, 0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)',
  };
}

function SwipeableTaskCard({
  id,
  swipeLeftActions,
  swipeRightActions,
  children,
}: {
  id: string;
  swipeLeftActions: SwipeAction[];
  swipeRightActions: SwipeAction[];
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const gestureRef = useRef<'idle' | 'horizontal' | 'vertical'>('idle');
  const draggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const openSideRef = useRef<'left' | 'right' | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [openSide, setOpenSideState] = useState<'left' | 'right' | null>(null);
  const maxSwipeLeft = Math.min(swipeLeftActions.length * SWIPE_ACTION_WIDTH, SWIPE_MAX_ACTION_WIDTH);
  const maxSwipeRight = Math.min(swipeRightActions.length * SWIPE_ACTION_WIDTH, SWIPE_MAX_ACTION_WIDTH);
  const canSwipe = maxSwipeLeft > 0 || maxSwipeRight > 0;
  const leftRevealedWidth = offset > 0 ? Math.min(offset, maxSwipeRight) : 0;
  const rightRevealedWidth = offset < 0 ? Math.min(Math.abs(offset), maxSwipeLeft) : 0;
  const leftProgress = maxSwipeRight > 0 ? leftRevealedWidth / maxSwipeRight : 0;
  const rightProgress = maxSwipeLeft > 0 ? rightRevealedWidth / maxSwipeLeft : 0;

  const setSwipeOffset = (value: number) => {
    offsetRef.current = value;
    setOffset(value);
  };

  const setOpenSide = (value: 'left' | 'right' | null) => {
    openSideRef.current = value;
    setOpenSideState(value);
  };

  useEffect(() => {
    const close = () => {
      setSwipeOffset(0);
      setOpenSide(null);
    };
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (offsetRef.current === 0) return;
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      close();
    };

    window.addEventListener(SWIPE_OPEN_EVENT, closeOther);
    window.addEventListener(SWIPE_CLOSE_EVENT, close);
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => {
      window.removeEventListener(SWIPE_OPEN_EVENT, closeOther);
      window.removeEventListener(SWIPE_CLOSE_EVENT, close);
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
    };
  }, [id]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSwipe || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if ((event.target as Element).closest('[data-task-drag-handle="true"]')) return;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    startOffsetRef.current = offsetRef.current;
    gestureRef.current = 'idle';
    draggedRef.current = false;
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (gestureRef.current === 'idle') {
      if (absY > 8 && absY > absX) {
        gestureRef.current = 'vertical';
        setDragging(false);
        return;
      }
      if (absX > 8 && absX > absY + 4) {
        gestureRef.current = 'horizontal';
        event.currentTarget.setPointerCapture(event.pointerId);
        setOpenSide(null);
        window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: id }));
      }
    }

    if (gestureRef.current !== 'horizontal') return;
    const nextOffset = clamp(startOffsetRef.current + dx, -maxSwipeLeft, maxSwipeRight);
    draggedRef.current = true;
    setSwipeOffset(nextOffset);
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);

    if (gestureRef.current === 'horizontal') {
      const nextOffset =
        offsetRef.current <= -SWIPE_THRESHOLD && maxSwipeLeft > 0
          ? -maxSwipeLeft
          : offsetRef.current >= SWIPE_THRESHOLD && maxSwipeRight > 0
            ? maxSwipeRight
            : 0;
      if (nextOffset !== 0) window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: id }));
      suppressClickRef.current = draggedRef.current;
      setOpenSide(nextOffset > 0 ? 'left' : nextOffset < 0 ? 'right' : null);
      setSwipeOffset(nextOffset);
      event.preventDefault();
      event.stopPropagation();
    }

    gestureRef.current = 'idle';
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 120);
  };

  const renderActions = (
    actions: SwipeAction[],
    side: 'left' | 'right',
    revealedWidth: number,
    progress: number,
  ) => {
    if (actions.length === 0) return null;
    const actionWidth = revealedWidth / actions.length;
    const visible = progress > 0 || openSide === side;
    const transition = dragging
      ? 'opacity 80ms ease, transform 80ms ease'
      : 'width 150ms ease, opacity 150ms ease, transform 150ms ease';

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: side === 'left' ? 0 : undefined,
          right: side === 'right' ? 0 : undefined,
          display: 'flex',
          flexDirection: side === 'right' ? 'row-reverse' : 'row',
          width: revealedWidth,
          opacity: visible ? 1 : 0,
          overflow: 'hidden',
          zIndex: 0,
          transition: dragging ? 'opacity 80ms ease' : 'width 150ms ease, opacity 150ms ease',
        }}
      >
        {actions.map(({ key, label, Icon, tone = 'default', onClick }) => {
          const colors = actionStyle(key, tone);

          return (
            <button
              key={key}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick();
                setSwipeOffset(0);
                setOpenSide(null);
                window.dispatchEvent(new Event(SWIPE_CLOSE_EVENT));
              }}
              style={{
                width: actionWidth,
                opacity: progress,
                transform: `scale(${0.9 + progress * 0.1})`,
                transformOrigin: side === 'right' ? 'right center' : 'left center',
                border: 'none',
                background: colors.background,
                color: colors.color,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 800,
                lineHeight: 1.1,
                textAlign: 'center',
                padding: '0 6px',
                flexShrink: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                boxShadow: 'none',
                transition,
              }}
            >
              <Icon size={18} strokeWidth={2} />
              <span
                style={{
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      data-task-swipe-root="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: leftRevealedWidth > 0 || rightRevealedWidth > 0 ? 'auto' : 'none',
        }}
      >
        {renderActions(swipeRightActions, 'left', leftRevealedWidth, leftProgress)}
        {renderActions(swipeLeftActions, 'right', rightRevealedWidth, rightProgress)}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (!draggedRef.current && offsetRef.current === 0) return;
          event.preventDefault();
          event.stopPropagation();
          setSwipeOffset(0);
          setOpenSide(null);
        }}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: dragging ? 'none' : 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(18,18,20,0.96)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Checkbox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
        background: checked ? 'var(--gold-grad)' : 'transparent',
      }}
    >
      {checked && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6.5L5 9.5L10 3.5"
            stroke="#1A1308"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function TaskRow({
  task,
  onToggle,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onEdit,
  onTransfer,
  onSend,
  onDelete,
  onCopy,
  showDragHandle = false,
  dragHandleAttributes,
  dragHandleListeners,
  variant = 'default',
  selected = false,
}: {
  task: Task;
  onToggle: () => void;
  onSelect: () => void;
  onMenu?: () => void;
  onToggleSubtask?: (id: string) => void;
  onEditSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
  onAddSubtask?: () => void;
  onEdit?: () => void;
  onTransfer?: () => void;
  onSend?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  showDragHandle?: boolean;
  dragHandleAttributes?: HTMLAttributes<HTMLSpanElement>;
  dragHandleListeners?: HTMLAttributes<HTMLSpanElement>;
  variant?: 'default' | 'list';
  selected?: boolean;
  subtaskTogglePlacement?: 'inline' | 'bottom-right';
}) {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const checked = task.completed;
  const text = taskText(task);
  const swipeLeftActions: SwipeAction[] = [
    onAddSubtask && { key: 'subtask', label: 'Підзадача', Icon: ListPlus, onClick: onAddSubtask },
    onEdit && { key: 'edit', label: 'Редагувати', Icon: Pencil, onClick: onEdit },
    onTransfer && { key: 'transfer', label: 'Перенести', Icon: ArrowRightLeft, onClick: onTransfer },
  ].filter(Boolean) as SwipeAction[];
  const swipeRightActions: SwipeAction[] = [
    onSend && { key: 'send', label: 'Відправити', Icon: Send, onClick: onSend },
    onDelete && {
      key: 'delete',
      label: 'Видалити',
      Icon: Trash2,
      tone: 'danger' as const,
      onClick: onDelete,
    },
    onCopy && { key: 'copy', label: 'Копіювати', Icon: Copy, onClick: onCopy },
  ].filter(Boolean) as SwipeAction[];

  return (
    <div 
     
      style={{
        borderBottom: '1px solid var(--hairline)',
        
       
      }}
    >
      <SwipeableTaskCard
        id={`task-${task.id}`}
        swipeLeftActions={swipeLeftActions}
        swipeRightActions={swipeRightActions}
      >
        <div
        onClick={() => {
          if (task.subtasks.length > 0) setSubtasksOpen((value) => !value);
        }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          minHeight: 56,
          padding: '14px 7px',
          position: 'relative',
          cursor: task.subtasks.length > 0 ? 'pointer' : 'default',
        }}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-label="Перемкнути статус"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Checkbox checked={checked} />
        </button>

        <button
          type="button"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div 
            style={{
              fontSize: 15.5,
              letterSpacing: -0.1,
              color: checked ? 'var(--txt-dim)' : 'var(--txt-main)',
              textDecorationLine: checked ? 'line-through' : 'none',
              textDecorationColor: 'rgba(244,245,247,0.3)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              lineHeight: 1.35,
              
            }}
          >
            {text}
          </div>
        </button>

        {task.time && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0.3,
              color: checked ? 'var(--txt-dim)' : 'var(--gold-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {task.time}
          </span>
        )}

        {showDragHandle && (
          <span
            {...dragHandleAttributes}
            {...dragHandleListeners}
            data-task-drag-handle="true"
            aria-label="Перетягнути"
            role="button"
            tabIndex={0}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 30,
              height: 34,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--txt-dim)',
              cursor: 'grab',
              flexShrink: 0,
              touchAction: 'none',
            }}
          >
            <GripVertical size={16} />
          </span>
        )}

        {task.subtasks.length > 0 && (
          <span
            aria-label={`${task.subtasks.length} підзадач`}
            style={{
              minWidth: 35,
              height: 35,
              borderRadius: 10,              
              background: subtasksOpen ? 'var(--background)' : 'transparent',
              color: subtasksOpen ? 'var(--txt-muted)' : 'var(--txt-main)',
              padding: '0 7px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 400,
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {task.subtasks.length}
          </span>
        )}
        </div>
      </SwipeableTaskCard>

      {subtasksOpen && task.subtasks.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--hairline)',
            marginTop: 2,
            paddingLeft: 30,
            paddingRight: 18,
            paddingBottom: 10,
            paddingTop: 8,
          }}
        >
          {task.subtasks.map((s) => {
            const subtaskSwipeLeftActions: SwipeAction[] = onEditSubtask
              ? [{ key: 'edit', label: 'Редагувати', Icon: Pencil, onClick: () => onEditSubtask(s.id) }]
              : [];
            const subtaskSwipeRightActions: SwipeAction[] = onDeleteSubtask
              ? [
                  {
                    key: 'delete',
                    label: 'Видалити',
                    Icon: Trash2,
                    tone: 'danger',
                    onClick: () => {
                      if (window.confirm('Видалити підзадачу?')) onDeleteSubtask(s.id);
                    },
                  },
                ]
              : [];

            return (
              <SwipeableTaskCard
                key={s.id}
                id={`subtask-${task.id}-${s.id}`}
                swipeLeftActions={subtaskSwipeLeftActions}
                swipeRightActions={subtaskSwipeRightActions}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '6px 0',
                    background: 'rgba(0,0,0,0.50)',
                  }}
                >
                  <button
                    onClick={() => onToggleSubtask?.(s.id)}
                    aria-label="Перемкнути підзадачу"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: onToggleSubtask ? 'pointer' : 'default',
                    }}
                  >
                    <Checkbox checked={s.completed} size={16} />
                  </button>
                  <span
                    style={{
                      fontSize: 14,
                      flex: 1,
                      color: s.completed ? 'var(--txt-dim)' : 'var(--txt-main)',
                      textDecorationLine: s.completed ? 'line-through' : 'none',
                      textDecorationColor: 'rgba(244,245,247,0.3)',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.35,
                    }}
                  >
                    {taskText(s)}
                  </span>
                </div>
              </SwipeableTaskCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
