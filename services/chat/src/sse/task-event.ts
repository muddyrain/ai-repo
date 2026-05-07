export interface TaskEvent {
  id: string;
  taskType: string;
  taskId: string;
  status: 'processing' | 'done' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
