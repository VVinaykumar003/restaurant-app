/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns Middleware function that authorizes based on role
 */
const redactUser = (user = {}) => {
  // only surface non-sensitive, small shape info
  const allowed = {};
  if (user._id) allowed._id = user._id;
  if (user.id) allowed.id = user.id;
  if (user.email) allowed.email = user.email;
  if (user.username) allowed.username = user.username;
  if (user.role) allowed.role = user.role;
  // show other keys but only names (not values) to help debugging
  allowed.keys = Object.keys(user).filter(
    (k) => !["hashedPin", "password", "hash", "overrideTokens"].includes(k)
  );
  return allowed;
};

const requireRole = (allowedRoles) => {
  // Normalize to array for easier checking. If caller passed nothing -> treat as empty array (no restriction)
  const roles = allowedRoles
    ? Array.isArray(allowedRoles)
      ? allowedRoles
      : [allowedRoles]
    : [];

  return (req, res, next) => {
    try {
      const now = new Date().toISOString();
      const path = req.originalUrl || req.url;
      const method = req.method;
      const rid = (req.params && req.params.rid) || null;
      const authHeaderPresent = !!(req.headers && req.headers.authorization);

      console.debug(`[${now}] [requireRole] Enter`, {
        path,
        method,
        rid,
        authHeaderPresent,
        allowedRoles: roles.length ? roles : "(none - no restriction)",
      });

      // Check if user exists and has a role
      if (
        !req.user ||
        (!req.user.role && !req.user.roles && !req.user.roleName)
      ) {
        console.warn(`[${now}] [requireRole] Missing req.user or role`, {
          path,
          rid,
          // show redacted/safe subset
          user: redactUser(req.user),
        });
        return res
          .status(401)
          .json({ error: "Unauthorized - User not authenticated" });
      }

      // Accept multiple possible role fields (role, roles array, roleName)
      const userRole =
        typeof req.user.role === "string"
          ? req.user.role
          : Array.isArray(req.user.roles) && req.user.roles.length
          ? req.user.roles[0]
          : typeof req.user.roleName === "string"
          ? req.user.roleName
          : undefined;

      console.debug(`[${now}] [requireRole] Resolved user role`, {
        path,
        rid,
        user: redactUser(req.user),
        resolvedRole: userRole,
      });

      if (!userRole) {
        console.warn(
          `[${now}] [requireRole] User object present but role could not be resolved`,
          {
            path,
            rid,
            userKeys: Object.keys(req.user || {}),
          }
        );
        return res
          .status(403)
          .json({ error: "Forbidden - user role not assigned" });
      }

      // If no roles were specified to middleware, treat as "any authenticated user allowed"
      if (roles.length === 0 || roles.includes("*")) {
        console.debug(
          `[${now}] [requireRole] No specific role restriction - allowing`,
          {
            path,
            rid,
            userRole,
          }
        );
        return next();
      }

      // Check if user has required role
      if (!roles.includes(userRole)) {
        console.warn(`[${now}] [requireRole] Role mismatch - denying`, {
          path,
          rid,
          userRole,
          required: roles,
        });
        return res
          .status(403)
          .json({ error: "Forbidden - Insufficient permissions" });
      }

      console.info(`[${now}] [requireRole] Authorized - proceeding`, {
        path,
        rid,
        userRole,
        required: roles,
      });

      return next();
    } catch (err) {
      // Defensive catch so errors in middleware don't crash the app
      const now = new Date().toISOString();
      console.error(
        `[${now}] [requireRole] Unexpected error`,
        err && err.stack ? err.stack : err
      );
      return res
        .status(500)
        .json({ error: "Internal server error (role check)" });
    }
  };
};

module.exports = requireRole;
