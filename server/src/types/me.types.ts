export interface MeUserDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface MeSessionDto {
  id: string;
  clientId: string;
  clientSlug: string;
  clientName: string;
}

export interface MeResponse {
  user: MeUserDto;
  session: MeSessionDto;
}
