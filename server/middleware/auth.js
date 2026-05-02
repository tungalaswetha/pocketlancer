import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * AUTH MIDDLEWARE
 * ----------------
 * Purpose:
 * - Allow access ONLY if a valid session exists
 * - Fail quietly for unauthenticated users
 * - Fail loudly only for real security issues
 *
 * Industry rule:
 * - 401 = not logged in (normal state)
 * - 403 = logged in but not allowed
 */

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    // User is not logged in (this is NORMAL, not an error)
    if (!token) {
      return res.status(401).json({
        msg: "Not authenticated",
      });
    }

    // Verify token integrity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.id).select("-password");

    // Token valid but user deleted or corrupted
    if (!user) {
      res.clearCookie("token");
      return res.status(401).json({
        msg: "Session invalid. Please log in again.",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    // Token expired or tampered
    res.clearCookie("token");
    return res.status(401).json({
      msg: "Session expired. Please log in again.",
    });
  }
};

/**
 * ROLE-BASED AUTHORIZATION
 * -----------------------
 * Example usage:
 * authorize("freelancer")
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        msg: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        msg: "Access denied",
      });
    }

    next();
  };
};
