import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { initSocketServer } from "./socket.js";

import authRoutes from "./routes/auth.js";
import channelsRoutes from "./routes/channels.js";
import conversationsRoutes from "./routes/conversations.js";
import messagesRoutes from "./routes/messages.js";
import usersRoutes from "./routes/users.js";
import uploadRoutes from "./routes/upload.js";
import aiRoutes from "./routes/ai.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration: only allow CLIENT_URL with credentials
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Static uploads serving
const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", CLIENT_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  },
  express.static(uploadsDir)
);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "OrbitChat Server", timestamp: new Date().toISOString() });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/channels", channelsRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Orbital Server Error",
  });
});

const server = http.createServer(app);

// Initialize Socket.io
initSocketServer(server, CLIENT_URL);

server.listen(PORT, () => {
  console.log(`🚀 OrbitChat Server operational on port ${PORT}`);
  console.log(`📡 Linked to Client URL: ${CLIENT_URL}`);
});

