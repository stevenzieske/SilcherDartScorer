import { z } from 'zod'

export const CreateTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  playerIds: z.array(z.string()).min(4),
  rules: z.object({
    startingScore: z.union([z.literal(301), z.literal(501), z.literal(701)]),
    doubleIn: z.boolean().default(false),
    doubleOut: z.boolean().default(true),
    groupLegsToWin: z.number().int().min(1).default(2),
    knockoutLegsToWin: z.number().int().min(1).default(3),
    boardCount: z.number().int().min(1).max(4).default(2),
    knockoutSize: z.union([z.literal(4), z.literal(8)]).default(4),
  }),
})

export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>
