import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../domain/error/errors";


export const authenticationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const auth = getAuth(req);
    if (!auth.userId) {
        throw new UnauthorizedError("Unauthorized");
    }
    console.log("what is the auth",auth)

    next();
};