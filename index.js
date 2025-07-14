// Express server for image upload, split, and zip download
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const archiver = require("archiver");
const path = require("path");

const app = express();
const upload = multer();

// Serve static files from public directory
app.use(express.static("public"));

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  // Get number of parts from form data, default to 7
  let parts = parseInt(req.body.parts, 10);
  if (isNaN(parts) || parts < 2) parts = 7;

  try {
    const inputBuffer = req.file.buffer;
    const metadata = await sharp(inputBuffer).metadata();
    const { width, height } = metadata;
    const cropHeight = Math.floor(height / parts);

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="parts.zip"',
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (let i = 0; i < parts; i++) {
      const buffer = await sharp(inputBuffer)
        .extract({ left: 0, top: i * cropHeight, width, height: cropHeight })
        .toBuffer();
      archive.append(buffer, { name: `part_${i + 1}.jpg` });
    }

    archive.finalize();
  } catch (err) {
    res.status(500).send("Error processing image.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
