import { z } from 'zod';

export const registrarTokenSchema = z.object({
  expoPushToken: z.string().trim().min(1),
  plataforma: z.enum(['ios', 'android', 'web']),
  dispositivo: z.string().trim().nullable().optional(),
});

export const marcarAbiertoSchema = z.object({
  notificationId: z.string().uuid(),
});
