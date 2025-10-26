"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const bodyParser = require("body-parser");
const path_1 = require("path");
const express = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
    app.use(express.static((0, path_1.join)(__dirname, '..', 'public')));
    await app.listen(3000, '0.0.0.0');
    console.log('Server started on http://localhost:3000');
}
bootstrap();
//# sourceMappingURL=main.js.map