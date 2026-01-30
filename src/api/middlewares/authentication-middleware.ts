import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../domain/error/errors";


export const authenticationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const auth = getAuth(req);
    console.log("what is the auth",auth)
    if (!auth.userId) {
        throw new UnauthorizedError("Unauthorized");
    }
    next();
};