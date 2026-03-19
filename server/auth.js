import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error("Missing JWT_SECRET in server environment.");
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET || "missing-secret",
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).send("Não autenticado.");
  try {
    const payload = jwt.verify(token, JWT_SECRET || "missing-secret");
    req.user = payload;
    return next();
  } catch {
    return res.status(401).send("Token inválido.");
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).send("Não autenticado.");
    if (req.user.role !== role) return res.status(403).send("Sem permissão.");
    return next();
  };
}

