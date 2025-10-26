"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const pdf_service_1 = require("../pdf/pdf.service");
const nlpUtils = require("wink-nlp-utils");
const bm25 = require('wink-bm25-text-search');
const openai_1 = require("openai");
let ChatService = class ChatService {
    constructor(pdfService) {
        this.pdfService = pdfService;
        this.documents = [];
        if (process.env.OPENAI_API_KEY) {
            this.openaiClient = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
            console.log('OpenAI client initialized');
        }
        else {
            console.log('OpenAI API key not set — AI summarization disabled');
        }
        this.bm25Engine = bm25();
        this.setupEngine().catch(err => console.error('Failed to setup BM25 engine:', err));
    }
    chunkText(text, chunkSize = 1000, overlap = 200) {
        const chunks = [];
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
        }
        else {
            console.warn('Not enough chunks to consolidate BM25. Add more content.');
        }
    }
    splitIntoSentences(text) {
        return text
            .split(/(?<=[.?!])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
    }
    localSummarize(text) {
        const sentences = this.splitIntoSentences(text);
        return sentences.length <= 2 ? text : sentences.slice(0, 2).join(' ');
    }
    async summarizeWithAI(text, question) {
        if (!this.openaiClient)
            return this.localSummarize(text);
        try {
            const prompt = `You are a helpful assistant. Answer the user's question in full sentences using the context provided.\n\n${question ? `Question: ${question}\n\n` : ''}Context:\n${text}\n\nAnswer:`;
            const resp = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 400
            });
            const content = resp.choices?.[0]?.message?.content;
            return content?.trim() || this.localSummarize(text);
        }
        catch (err) {
            console.error('OpenAI summarize error:', err);
            return this.localSummarize(text);
        }
    }
    async getAnswer(question) {
        if (!question || !question.trim())
            return 'Please provide a question.';
        if (!this.bm25Engine || this.documents.length === 0) {
            return 'Search engine not ready yet. Try again shortly.';
        }
        const results = this.bm25Engine.search(question);
        console.log('BM25 results:', results?.slice(0, 6));
        if (!results || results.length === 0)
            return 'Sorry, no relevant answer found.';
        const topN = Math.min(3, results.length);
        const topChunkIds = results.slice(0, topN).map((r) => parseInt(r[0]));
        let candidateSentences = [];
        for (const chunkId of topChunkIds) {
            const chunk = this.documents.find(d => d.id === chunkId);
            if (!chunk)
                continue;
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
                if (sText)
                    candidateSentences.push(sText);
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
        if (!/[.?!]$/.test(answer))
            answer += '.';
        if (this.openaiClient)
            return await this.summarizeWithAI(answer, question);
        if (answer.length > 700)
            return this.localSummarize(answer);
        return answer;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pdf_service_1.PdfService])
], ChatService);
//# sourceMappingURL=chat.service.js.map