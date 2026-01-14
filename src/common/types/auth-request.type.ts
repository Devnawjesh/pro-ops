import { Request } from 'express';

export type AuthRequest = Request & {
  user?: any; // later replace any with your AuthUser type
};
