"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePlayerSchema = void 0;
const zod_1 = require("zod");
exports.CreatePlayerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    nickname: zod_1.z.string().max(30).optional(),
    avatarColor: zod_1.z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
