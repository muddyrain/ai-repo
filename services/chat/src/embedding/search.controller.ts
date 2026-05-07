import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/type';
import { SearchService } from './search.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('api/search')
  async search(
    @Body() body: { query?: string; topK?: number },
    @Req() req: AuthenticatedRequest,
  ) {
    if (typeof body?.query !== 'string' || body.query.trim().length === 0) {
      throw new BadRequestException('query is required');
    }

    return this.searchService.similaritySearch(
      body.query.trim(),
      req.user.userId,
      body.topK,
    );
  }
}