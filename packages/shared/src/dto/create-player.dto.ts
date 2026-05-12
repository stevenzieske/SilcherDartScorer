import { z } from 'zod'

export const CreatePlayerSchema = z.object({
  name: z.string().min(1).max(50),
  nickname: z.string().max(30).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export type CreatePlayerDto = z.infer<typeof CreatePlayerSchema>
