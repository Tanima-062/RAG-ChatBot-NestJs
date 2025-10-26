import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PdfService {
  private pdfPath = 'reference.pdf'; 

  async getPdfText(): Promise<string> {
    try {
      console.log('Reading PDF from:', this.pdfPath);
      const dataBuffer = fs.readFileSync(this.pdfPath);
      const data = await pdfParse(dataBuffer);
      console.log('PDF text length:', data.text.length);
      return data.text;
    } catch (err) {
      console.error('Error reading PDF:', err);
      return '';
    }
  }
}
