export interface MeUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface MeSession {
  id: string;
  clientId: string;
  clientSlug: string;
  clientName: string;
}

export interface MeResponse {
  user: MeUser;
  session: MeSession;
}

export interface ProfilePatchBody {
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}
