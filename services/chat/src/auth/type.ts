export type AuthenticatedRequest = Request & {
  user: {
    userId: string;
  };
};