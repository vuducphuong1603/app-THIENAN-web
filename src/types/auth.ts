export type AppRole = "admin" | "sector_leader" | "catechist";

export type Profile = {
  id: string;
  username: string;
  role: AppRole;
  fullName: string;
  sector?: string | null;
  className?: string | null;
};

export type SessionSnapshot = {
  userId: string;
  profile: Profile;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type SessionState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: SessionSnapshot | null;
};
