import { Request, Response, NextFunction, RequestHandler } from "express";

// Wraps an async route handler and forwards any rejected promise to
// Express's error-handling middleware instead of crashing the process.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
