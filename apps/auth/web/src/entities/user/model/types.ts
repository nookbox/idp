export type User = {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  marketingConsent?: boolean;
};
