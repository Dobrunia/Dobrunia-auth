import type { AccessTokenPayload } from './access-token.types';

declare global {
  namespace Express {
    interface Request {
      /** Заполняется middleware `requireAccessToken` после валидации Bearer JWT. */
      accessAuth?: AccessTokenPayload;
    }
  }
}

export {};
