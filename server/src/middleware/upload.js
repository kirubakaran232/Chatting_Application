import multer from "multer";

const allowed = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/webm",
  "audio/wav",
  "application/pdf",
  "text/plain",
  "application/zip"
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.includes(file.mimetype)) return cb(new Error("Unsupported file type"));
    cb(null, true);
  }
});
