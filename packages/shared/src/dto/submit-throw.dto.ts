import { z } from 'zod'

export const SubmitThrowSchema = z.object({
  judgeId: z.string().min(1),
  darts: z.array(z.string()).min(1).max(3),
})

export type SubmitThrowDto = z.infer<typeof SubmitThrowSchema>
