"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
var agents_1 = require("@livekit/agents");
var openai = require("@livekit/agents-plugin-openai");
var dotenv_1 = require("dotenv");
var node_path_1 = require("node:path");
var node_url_1 = require("node:url");
var zod_1 = require("zod");
var __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
var envPath = node_path_1.default.join(__dirname, '../.env.local');
var openApiKey = process.env.OPENAI_API_KEY;
dotenv_1.default.config({ path: envPath });
exports.default = (0, agents_1.defineAgent)({
    entry: function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var participant, model, fncCtx, agent, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.connect()];
                case 1:
                    _a.sent();
                    console.log('waiting for participant');
                    return [4 /*yield*/, ctx.waitForParticipant()];
                case 2:
                    participant = _a.sent();
                    console.log("starting assistant example agent for ".concat(participant.identity));
                    model = new openai.realtime.RealtimeModel({
                        instructions: 'You are a helpful therapist.',
                        model: "gpt-4o-realtime-preview-2024-10-01",
                        apiKey: openApiKey
                    });
                    fncCtx = {
                        weather: {
                            description: 'Get the weather in a location',
                            parameters: zod_1.z.object({
                                location: zod_1.z.string().describe('The location to get the weather for'),
                            }),
                            execute: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var response, weather;
                                var location = _b.location;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            console.debug("executing weather function for ".concat(location));
                                            return [4 /*yield*/, fetch("https://wttr.in/".concat(location, "?format=%C+%t"))];
                                        case 1:
                                            response = _c.sent();
                                            if (!response.ok) {
                                                throw new Error("Weather API returned status: ".concat(response.status));
                                            }
                                            return [4 /*yield*/, response.text()];
                                        case 2:
                                            weather = _c.sent();
                                            return [2 /*return*/, "The weather in ".concat(location, " right now is ").concat(weather, ".")];
                                    }
                                });
                            }); },
                        },
                    };
                    agent = new agents_1.multimodal.MultimodalAgent({ model: model, fncCtx: fncCtx });
                    return [4 /*yield*/, agent
                            .start(ctx.room, participant)
                            .then(function (session) { return session; })];
                case 3:
                    session = _a.sent();
                    session.conversation.item.create(agents_1.llm.ChatMessage.create({
                        role: agents_1.llm.ChatRole.ASSISTANT,
                        text: 'How can I help you today?',
                    }));
                    session.response.create();
                    return [2 /*return*/];
            }
        });
    }); },
});
agents_1.cli.runApp(new agents_1.WorkerOptions({ agent: (0, node_url_1.fileURLToPath)(import.meta.url) }));
