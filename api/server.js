import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { v4 as uuidv4 } from "uuid";
import cloudku from "cloudku-uploader";

// ===== ADMIN LOGIN =====
const ADMIN_USER = "HezoxaGanteng";
const ADMIN_PASS = "Hezx121";

// SIMPAN METADATA (sementara di RAM)
let files = [];

const app = express();
app.use(cors());
app.use(express.json());

// handle form-data upload
app.use(
  fileUpload({
    useTempFiles: true
  })
);

// 🔐 LOGIN ADMIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: "Login salah" });
});

// 📤 UPLOAD FILE → CLOUDKU
app.post("/api/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const f = req.files.file;

    // upload ke cloudku
    const uploaded = await cloudku.upload(f.tempFilePath);

    const id = uuidv4();

    const meta = {
      id,
      filename: f.name,
      url: uploaded.url, // URL download cloudku-uploader
      size: f.size,
      createdAt: new Date(),
      premium: req.body.premium === "true",
      accessKey: req.body.accessKey || null
    };

    files.push(meta);

    res.json({
      success: true,
      file: meta,
      openUrl: `/file.html?id=${id}`
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Upload gagal", error: err.message });
  }
});

// 📄 AMBIL METADATA FILE PUBLIC
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

// 🔑 CEK ACCESS KEY
app.post("/api/file/:id/access", (req, res) => {
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: "File tidak ditemukan" });

  // non premium langsung bisa
  if (!file.premium) {
    return res.json({
      allowed: true,
      url: file.url
    });
  }

  // cek key
  if (req.body.key === file.accessKey) {
    return res.json({
      allowed: true,
      url: file.url
    });
  }

  return res.status(401).json({
    allowed: false,
    message: "Access key salah"
  });
});

export default app;
