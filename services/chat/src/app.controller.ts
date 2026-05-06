import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('health')
  health() {
    return { ok: true };
  }
}
