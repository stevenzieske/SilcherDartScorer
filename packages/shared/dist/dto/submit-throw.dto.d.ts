import { z } from 'zod';
export declare const SubmitThrowSchema: z.ZodObject<{
    judgeId: z.ZodString;
    darts: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    judgeId: string;
    darts: string[];
}, {
    judgeId: string;
    darts: string[];
}>;
export type SubmitThrowDto = z.infer<typeof SubmitThrowSchema>;
