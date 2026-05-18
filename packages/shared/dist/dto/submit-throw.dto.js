"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitThrowSchema = void 0;
const zod_1 = require("zod");
exports.SubmitThrowSchema = zod_1.z.object({
    judgeId: zod_1.z.string().min(1),
    darts: zod_1.z.array(zod_1.z.string()).min(1).max(3),
});
