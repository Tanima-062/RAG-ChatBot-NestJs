"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const pdfParse = require("pdf-parse");
let PdfService = class PdfService {
    constructor() {
        this.pdfPath = 'reference.pdf';
    }
    async getPdfText() {
        try {
            console.log('Reading PDF from:', this.pdfPath);
            const dataBuffer = fs.readFileSync(this.pdfPath);
            const data = await pdfParse(dataBuffer);
            console.log('PDF text length:', data.text.length);
            return data.text;
        }
        catch (err) {
            console.error('Error reading PDF:', err);
            return '';
        }
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)()
], PdfService);
//# sourceMappingURL=pdf.service.js.map