import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { TaskEvent } from './task-event';

@Injectable()
export class SseService {
  private readonly connections = new Map<string, Subject<TaskEvent>>();

  subscribe(userId: string): Observable<TaskEvent> {
    let subject = this.connections.get(userId);

    if (!subject || subject.closed) {
      subject = new Subject<TaskEvent>();
      this.connections.set(userId, subject);
    }

    return subject.asObservable();
  }

  emit(userId: string, event: TaskEvent) {
    const subject = this.connections.get(userId);
    subject?.next(event);
  }

  remove(userId: string) {
    const subject = this.connections.get(userId);
    if (!subject) {
      return;
    }

    subject.complete();
    this.connections.delete(userId);
  }
}
