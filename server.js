import express from "express";
import multer from "multer";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ADMIN_USER, ADMIN_PASS } from "./lib/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ensure uploads dir exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// in-memory DB
let files = [];

// Admin login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, message: "Login berhasil" });
  }
  return res.status(401).json({ success: false, message: "Username atau password salah" });
});

// Upload file (admin only)
app.post("/api/upload", upload.single("file"), (req, res) => {
  const { premium, accessKey } = req.body;

  const id = uuidv4();

  const fileData = {
    id,
    filename: req.file.originalname,
    stored: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    createdAt: new Date(),
    premium: premium === "true",
    accessKey: accessKey || null
  };

  files.push(fileData);

  res.json({
    success: true,
    downloadUrl: `/file.html?id=${id}`,
    id
  });
});

// Get metadata public
app.get("/api/file/:id", (req, res) => {
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: "File tidak ditemukan" });

  res.json({
    id: file.id,
    filename: file.filename,
    size: file.size,
    createdAt: file.createdAt,
    premium: file.premium
  });
});

// Verify key & download link
app.post("/api/file/:id/access", (req, res) => {
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: "File tidak ditemukan" });

  if (!file.premium) {
    return res.json({
      allowed: true,
      download: `/api/download/${file.id}`
    });
  }

  const { key } = req.body;

  if (key === file.accessKey) {
    return res.json({
      allowed: true,
      download: `/api/download/${file.id}`
    });
  }

  res.status(401).json({ allowed: false, message: "Akses key salah" });
});

// Download
app.get("/api/download/:id", (req, res) => {
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: "File tidak ditemukan" });

  res.download(path.join(__dirname, file.path), file.filename);
});

const port = 3000;
app.listen(port, () => console.log(`Hezfile running on ${port}`));
