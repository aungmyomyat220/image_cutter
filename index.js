// Express server for image upload, split, and zip download
import express from "express";
import multer from "multer";
import sharp from "sharp";
import archiver from "archiver";
import dotenv from "dotenv";
dotenv.config();

export const app = express();
const upload = multer();

// Serve static files from public directory
app.use(express.static("public"));

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  // Get number of parts from form data, default to 7
  let parts = parseInt(req.body.parts, 10);
  if (isNaN(parts) || parts < 2) parts = 7;

  // Get start number from form data, default to 1
  let start = parseInt(req.body.start, 10);
  if (isNaN(start) || start < 1) start = 1;

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
      // Zero-padded 3-digit filename, starting from 'start'
      const fileNumber = (start + i).toString().padStart(3, "0");
      archive.append(buffer, { name: `${fileNumber}.jpg` });
    }

    archive.finalize();
  } catch (err) {
    res.status(500).send("Error processing image.");
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.APP_ENV === "local") {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
