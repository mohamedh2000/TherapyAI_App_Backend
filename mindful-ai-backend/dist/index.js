"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var livekit_server_sdk_1 = require("livekit-server-sdk");
var dotenv = require('dotenv');
dotenv.config();
// NOTE: you are expected to define the following environment variables in `.env.local`:
var API_KEY = process.env.LIVEKIT_API_KEY;
var API_SECRET = process.env.LIVEKIT_API_SECRET;
var LIVEKIT_URL = process.env.LIVEKIT_URL;
var express = require('express');
var cors = require('cors');
var app = express();
var port = 3000;
app.use(cors());
function createParticipantToken(userInfo, roomName) {
    var at = new livekit_server_sdk_1.AccessToken(API_KEY, API_SECRET, __assign(__assign({}, userInfo), { ttl: "15m" }));
    var grant = {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
    };
    at.addGrant(grant);
    return at.toJwt();
}
app.get('/api/connection-details', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var participantIdentity, roomName, participantToken, data, headers, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                if (LIVEKIT_URL === undefined) {
                    throw new Error("LIVEKIT_URL is not defined");
                }
                if (API_KEY === undefined) {
                    throw new Error("LIVEKIT_API_KEY is not defined");
                }
                if (API_SECRET === undefined) {
                    throw new Error("LIVEKIT_API_SECRET is not defined");
                }
                participantIdentity = "voice_assistant_user_".concat(Math.floor(Math.random() * 10000));
                roomName = "voice_assistant_room_".concat(Math.floor(Math.random() * 10000));
                return [4 /*yield*/, createParticipantToken({ identity: participantIdentity }, roomName)];
            case 1:
                participantToken = _a.sent();
                data = {
                    serverUrl: LIVEKIT_URL,
                    roomName: roomName,
                    participantToken: participantToken,
                    participantName: participantIdentity,
                };
                headers = new Headers({
                    "Cache-Control": "no-store",
                    'Access-Control-Allow-Origin': '*',
                });
                res.setHeader('Cache-Control', 'no-store');
                return [2 /*return*/, res.status(200).json(data)];
            case 2:
                error_1 = _a.sent();
                if (error_1 instanceof Error) {
                    console.error(error_1);
                    return [2 /*return*/, res.status(500).json({ error: error_1.message })];
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.get('/', function (req, res) {
    res.send('Hello World!');
});
app.listen(port, function () {
    console.log("Example app listening on port ".concat(port));
});
