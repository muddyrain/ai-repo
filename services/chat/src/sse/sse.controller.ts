import {
  Controller,
  MessageEvent,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/type';
import { SseService } from './sse.service';

@UseGuards(JwtAuthGuard)
@Controller('api/sse')
export class SseController {
  constructor(private readonly sseService: SseService) { }

  @Sse()
  subscribe(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = req.user.userId;
    req.on('close', () => {
      this.sseService.remove(userId);
    });

    return this.sseService.subscribe(userId).pipe(
      map((event) => ({
        data: JSON.stringify(event),
      } as MessageEvent)),
    );
  }
}
