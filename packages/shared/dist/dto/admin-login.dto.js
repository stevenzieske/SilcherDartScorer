"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLoginSchema = void 0;
const zod_1 = require("zod");
exports.AdminLoginSchema = zod_1.z.object({
    pin: zod_1.z.string().min(1),
});
