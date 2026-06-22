export interface AuthenticatedUser {
  id: string;
  role: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  body: any;
  params: any;
  query: any;
}
