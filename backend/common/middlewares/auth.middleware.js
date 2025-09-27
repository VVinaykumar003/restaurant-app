const { verifyToken } = require("../libs/jwt");
const { randomBytes } = require("crypto");

/**
 * Authentication middleware with:
 * - method-aware public route handling (GET-only public endpoints possible)
 * - structured/timestamped logs
 * - request-id correlation (uses x-request-id or generates one)
 * - safe token preview (never logs full token)
 */
module.exports = function authMiddleware(req, res, next) {
  const now = new Date().toISOString();
  const method = (req.method || "GET").toUpperCase();
  const path = req.originalUrl || req.url || "";
  const rid = req.params?.rid || null;

  // request id for correlation
  const headerReqId = req.header && req.header("x-request-id");
  const reqId = headerReqId || randomBytes(8).toString("hex");
  // attach request id for downstream middlewares/controllers
  req.requestId = req.requestId || reqId;
  res.setHeader && res.setHeader("x-request-id", req.requestId);

  console.debug(`[${now}] [authMiddleware] Enter`, {
    reqId,
    method,
    path,
    rid,
  });

  /**
   * Public routes definition:
   * - list objects of { method, path } where path may contain :params
   * - matching is done by comparing method and prefix (treating :param as wildcard)
   *
   * IMPORTANT: Make public only safe-read endpoints. Keep destructive endpoints protected.
   */
  const publicRoutes = [
    { method: "GET", path: `/api/${rid}/admin/menu` }, // allow public reads of menu
    { method: "GET", path: `/api/${rid}/tables` }, // list tables (GET)
    { method: "GET", path: `/api/${rid}/tables/:id` }, // table details (GET)
    { method: "GET", path: `/api/${rid}/calls` }, // call listings (GET)
  ];

  const matchesPublic = publicRoutes.some((r) => {
    if ((r.method || "").toUpperCase() !== method) return false;
    // treat :param placeholders as wildcard => remove them for prefix match
    const cleaned = (r.path || "").replace(/:([a-zA-Z0-9_]+)/g, "");
    return path.startsWith(cleaned);
  });

  if (matchesPublic) {
    console.info(`[${now}] [authMiddleware] Public route - skipping auth`, {
      reqId,
      method,
      path,
      rid,
    });
    return next();
  }

  // Extract token (Bearer <token>)
  const rawAuth = req.header && req.header("Authorization");
  const token = rawAuth ? rawAuth.replace(/^Bearer\s+/i, "") : null;

  if (!token) {
    console.warn(`[${now}] [authMiddleware] Missing Authorization header`, {
      reqId,
      method,
      path,
      rid,
    });
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // Safe token preview for logs (do NOT log full token)
  const tokenPreview =
    typeof token === "string" && token.length > 10
      ? `${token.slice(0, 6)}...${token.slice(-4)}`
      : token;

  console.debug(`[${now}] [authMiddleware] Token present`, {
    reqId,
    method,
    path,
    rid,
    tokenLength: token.length,
    tokenPreview,
  });

  try {
    const decoded = verifyToken(token);

    // Minimal safe user object attached to req (avoid adding secrets)
    req.user = {
      restaurantId: decoded.restaurantId,
      role: decoded.role || "user",
      // include other safe identifiers only if necessary:
      // id: decoded.id, email: decoded.email
    };

    console.info(`[${now}] [authMiddleware] Token verified`, {
      reqId,
      method,
      path,
      rid,
      user: { restaurantId: req.user.restaurantId, role: req.user.role },
    });

    return next();
  } catch (err) {
    console.error(`[${now}] [authMiddleware] Token verification failed`, {
      reqId,
      method,
      path,
      rid,
      error: err && err.message,
    });
    return res.status(400).json({ error: "Invalid token" });
  }
};
