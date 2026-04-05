import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const raw = process.env.JWT_SECRET;
const JWT_SECRET = typeof raw === "string" ? raw.trim() : "";
if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error(
    "[alto-mar] JWT_SECRET em falta ou vazio. Crie server/.env a partir de server/.env.example e defina um segredo forte (ex.: openssl rand -hex 32). A API não arranca sem JWT_SECRET."
  );
  process.exit(1);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).send("Não autenticado.");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
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
