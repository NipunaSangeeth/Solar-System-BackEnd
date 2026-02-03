import { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { ForbiddenError, UnauthorizedError } from "../../domain/error/errors";
import { UserPublicMetadata } from "../../domain/types";

export const authorizationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    throw new UnauthorizedError("Unauthorized");
  }
  // Fetch the user's public metadata from Clerk server-side (reliable)
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const role = (user.publicMetadata as UserPublicMetadata | undefined)?.role;
    if (!role || role !== "admin") {
      throw new ForbiddenError("Forbidden - Admin access required");
    }
    // Authorized
    next();
  } catch (err) {
    // If Clerk API call fails or user not found, deny access
    throw new ForbiddenError("Forbidden - Admin access required");
  }
};

//////////////////////

// import { NextFunction, Request, Response } from "express";
// import { getAuth } from "@clerk/express";
// import { User } from "../../infrastructure/entities/User";

// import { UserPublicMetadata } from "../../domain/types";
// import { ForbiddenError, UnauthorizedError } from "../../domain/error/errors";

// export const authorizationMiddleware = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     const auth = getAuth(req);
//     if (!auth.userId) {
//         throw new UnauthorizedError("Unauthorized");
//     }

//     const publicMetadata = auth.sessionClaims?.metadata as UserPublicMetadata;

//     if (publicMetadata.role !== "admin") {
//         throw new ForbiddenError("Forbidden");
//     }
//     next();
// };