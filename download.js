const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif"
};

module.exports = (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method Not Allowed");
  }

  let file = req.query.file;
  const type = req.query.type || "images";

  if (Array.isArray(file)) file = file[0];
  if (typeof file !== "string" || type !== "images") {
    return res.status(400).send("Invalid request");
  }

  try {
    file = decodeURIComponent(file);
  } catch {
    return res.status(400).send("Invalid filename");
  }

  // Only a filename is allowed; no folders or path traversal.
  file = path.basename(file);
  if (!file || file !== path.basename(file)) {
    return res.status(400).send("Invalid filename");
  }

  const imageDir = path.resolve(process.cwd(), "public", "images");
  const filePath = path.resolve(imageDir, file);

  if (!filePath.startsWith(imageDir + path.sep)) {
    return res.status(403).send("Forbidden");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).send("File not found");
  }

  const ext = path.extname(file).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const size = fs.statSync(filePath).size;

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(size));
  res.setHeader("Content-Disposition", `inline; filename="${file.replace(/"/g, "")}"`);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "HEAD") return res.status(200).end();

  return res.status(200).send(fs.readFileSync(filePath));
};
