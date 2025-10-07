export type AppRole = "admin" | "catechist";

export type Profile = {
  id: string;
  username: string;
  role: AppRole;
  fullName: string;
  sector?: string | null;
  className?: string | null;
};

export type SessionState = {
  isLoading: boolean;
  session?: {
    userId: string;
    profile: Profile;
  } | null;
};
