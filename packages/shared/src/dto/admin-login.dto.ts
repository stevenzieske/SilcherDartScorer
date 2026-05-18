import { z } from 'zod'

export const AdminLoginSchema = z.object({
  pin: z.string().min(1),
})

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>
