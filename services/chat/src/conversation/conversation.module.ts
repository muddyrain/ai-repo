import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [
    ConversationService,
    MessageService,
  ],
  controllers: [ConversationController],
  exports: [ConversationService, MessageService],
})
export class ConversationModule { }
