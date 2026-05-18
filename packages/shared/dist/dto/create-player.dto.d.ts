import { z } from 'zod';
export declare const CreatePlayerSchema: z.ZodObject<{
    name: z.ZodString;
    nickname: z.ZodOptional<z.ZodString>;
    avatarColor: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    avatarColor: string;
    nickname?: string | undefined;
}, {
    name: string;
    avatarColor: string;
    nickname?: string | undefined;
}>;
export type CreatePlayerDto = z.infer<typeof CreatePlayerSchema>;
