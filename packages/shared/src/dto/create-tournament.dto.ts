import { z } from 'zod'

export const CreateTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  playerIds: z.array(z.string()).min(2),
  rules: z.object({
    startingScore: z.union([z.literal(301), z.literal(501), z.literal(701)]),
    doubleIn: z.boolean().default(false),
    doubleOut: z.boolean().default(true),
    legsToWin: z.number().int().min(1).default(3),
    boardCount: z.number().int().min(1).max(4).default(1),
  }),
})

export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>
