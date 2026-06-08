import { z } from 'zod';

const CLIENT_NAME_MAX = 255;
const CLIENT_SLUG_MAX = 64;
const CLIENT_DESCRIPTION_MAX = 2000;
const CLIENT_URL_MAX = 2048;
const CLIENT_REDIRECT_URIS_MAX = 10;

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function validatePublicClientUrl(value: string, ctx: z.RefinementCtx): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid absolute URL' });
    return;
  }

  if (url.username || url.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL credentials are not allowed' });
  }
  if (url.hash) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL fragments are not allowed' });
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopbackHostname(url.hostname))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use HTTPS, or HTTP only for localhost/loopback development',
    });
  }
}

const publicClientUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(CLIENT_URL_MAX)
  .superRefine(validatePublicClientUrl);

export const clientRegistrationBodySchema = z
  .object({
    name: z.string().trim().min(2).max(CLIENT_NAME_MAX),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(CLIENT_SLUG_MAX)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase Latin letters, digits, and single hyphen-separated words'
      ),
    description: z.string().trim().max(CLIENT_DESCRIPTION_MAX).optional(),
    baseUrl: publicClientUrlSchema.optional(),
    logoUrl: publicClientUrlSchema.optional(),
    redirectUris: z
      .array(publicClientUrlSchema)
      .min(1)
      .max(CLIENT_REDIRECT_URIS_MAX)
      .superRefine((uris, ctx) => {
        if (new Set(uris).size !== uris.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'redirectUris must not contain duplicates',
          });
        }
      }),
  })
  .strict();

export type ClientRegistrationBody = z.infer<typeof clientRegistrationBodySchema>;
