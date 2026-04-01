import { z } from 'zod';
import { PROFILE_FIELD_MAX } from '../../constants/validation.constants';

function trimToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

/**
 * Тело PATCH /auth/me: полный снимок отображаемых полей профиля (пустая строка → null в БД).
 */
export const profilePatchBodySchema = z
  .object({
    username: z.string().max(PROFILE_FIELD_MAX.USERNAME),
    firstName: z.string().max(PROFILE_FIELD_MAX.NAME),
    lastName: z.string().max(PROFILE_FIELD_MAX.NAME),
    avatarUrl: z.string().max(PROFILE_FIELD_MAX.AVATAR_URL),
  })
  .transform((d) => ({
    username: trimToNull(d.username),
    firstName: trimToNull(d.firstName),
    lastName: trimToNull(d.lastName),
    avatarUrl: trimToNull(d.avatarUrl),
  }))
  .superRefine((d, ctx) => {
    if (d.avatarUrl !== null && !/^https?:\/\/.+/i.test(d.avatarUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'avatarUrl must be an http(s) URL or empty',
        path: ['avatarUrl'],
      });
    }
  });

export type ProfilePatchBody = z.infer<typeof profilePatchBodySchema>;
