import { z } from 'zod';
export declare const AdminLoginSchema: z.ZodObject<{
    pin: z.ZodString;
}, "strip", z.ZodTypeAny, {
    pin: string;
}, {
    pin: string;
}>;
export type AdminLoginDto = z.infer<typeof AdminLoginSchema>;
