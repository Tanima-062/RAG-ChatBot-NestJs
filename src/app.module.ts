import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [PdfModule, ChatModule],
})
export class AppModule {}
