export const STATUS_COLORS = {
  new: 'primary',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
  on_hold: 'default'
} as const;

export const DEFAULT_STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
  on_hold: 'Приостановлена'
};

export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25];
export const DEFAULT_ROWS_PER_PAGE = 10; 