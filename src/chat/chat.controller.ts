import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body('question') question: string) {
    if (!question) return { answer: 'Please provide a question.' };

    const answer = await this.chatService.getAnswer(question);
    return { answer };
  }
}
