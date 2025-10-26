import { Injectable } from '@nestjs/common';
import { PdfService } from '../pdf/pdf.service';
import * as nlpUtils from 'wink-nlp-utils';

const bm25 = require('wink-bm25-text-search');

import OpenAI from 'openai';

@Injectable()
export class ChatService {
  private bm25Engine: any;
  private documents: { id: number; content: string }[] = [];
  private openaiClient?: OpenAI;

  constructor(private readonly pdfService: PdfService) {
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('OpenAI client initialized');
    } else {
      console.log('OpenAI API key not set — AI summarization disabled');
    }

    this.bm25Engine = bm25();
    this.setupEngine().catch(err => console.error('Failed to setup BM25 engine:', err));
  }

  
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async setupEngine() {
    console.log('ChatService initializing BM25 engine...');
    const pdfText = await this.pdfService.getPdfText();
    if (!pdfText || pdfText.length === 0) {
      console.warn('PDF text empty — BM25 will not be initialized');
      return;
    }

    const chunks = this.chunkText(pdfText, 1000, 200);
    console.log(`Created ${chunks.length} chunks`);

    this.bm25Engine.defineConfig({ fldWeights: { content: 1 } });
    this.bm25Engine.definePrepTasks([
      nlpUtils.string.lowerCase,
      nlpUtils.string.removeExtraSpaces,
      nlpUtils.string.tokenize0
    ]);

    chunks.forEach((chunk, idx) => {
      this.documents.push({ id: idx, content: chunk });
      this.bm25Engine.addDoc({ content: chunk }, idx);
    });

    if (chunks.length >= 3) {
      this.bm25Engine.consolidate();
      console.log(`Indexed ${chunks.length} chunks from PDF`);
    } else {
      console.warn('Not enough chunks to consolidate BM25. Add more content.');
    }
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  private localSummarize(text: string) {
    const sentences = this.splitIntoSentences(text);
    return sentences.length <= 2 ? text : sentences.slice(0, 2).join(' ');
  }

  private async summarizeWithAI(text: string, question?: string) {
    if (!this.openaiClient) return this.localSummarize(text);

    try {
      const prompt = `You are a helpful assistant. Answer the user's question in full sentences using the context provided.\n\n${question ? `Question: ${question}\n\n` : ''}Context:\n${text}\n\nAnswer:`;
      const resp = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400
      });
      const content = resp.choices?.[0]?.message?.content;
      return content?.trim() || this.localSummarize(text);
    } catch (err) {
      console.error('OpenAI summarize error:', err);
      return this.localSummarize(text);
    }
  }

  async getAnswer(question: string): Promise<string> {
    if (!question || !question.trim()) return 'Please provide a question.';

    if (!this.bm25Engine || this.documents.length === 0) {
      return 'Search engine not ready yet. Try again shortly.';
    }

    const results = this.bm25Engine.search(question);
    console.log('BM25 results:', results?.slice(0, 6));

    if (!results || results.length === 0) return 'Sorry, no relevant answer found.';

    const topN = Math.min(3, results.length);
    const topChunkIds = results.slice(0, topN).map((r: any) => parseInt(r[0]));

    let candidateSentences: string[] = [];

    for (const chunkId of topChunkIds) {
      const chunk = this.documents.find(d => d.id === chunkId);
      if (!chunk) continue;
      const sentences = this.splitIntoSentences(chunk.content);

      const localEngine = bm25();
      localEngine.defineConfig({ fldWeights: { content: 1 } });
      localEngine.definePrepTasks([nlpUtils.string.lowerCase, nlpUtils.string.removeExtraSpaces, nlpUtils.string.tokenize0]);
      sentences.forEach((s, idx) => localEngine.addDoc({ content: s }, idx));
      localEngine.consolidate();

      const localResults = localEngine.search(question);
      for (let i = 0; i < Math.min(2, localResults.length); i++) {
        const sid = parseInt(localResults[i][0]);
        const sText = sentences[sid];
        if (sText) candidateSentences.push(sText);
      }
    }

    candidateSentences = Array.from(new Set(candidateSentences));

    if (candidateSentences.length === 0) {
      const fallbackChunk = this.documents.find(d => d.id === parseInt(results[0][0]));
      const fallback = fallbackChunk?.content ?? '';
      return this.openaiClient ? await this.summarizeWithAI(fallback, question) : this.localSummarize(fallback);
    }

    const extracted = candidateSentences.join(' ');
    let answer = extracted;
    if (!/[.?!]$/.test(answer)) answer += '.';

    if (this.openaiClient) return await this.summarizeWithAI(answer, question);

    if (answer.length > 700) return this.localSummarize(answer);

    return answer;
  }
}
