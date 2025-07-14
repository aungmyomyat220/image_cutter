import multer from "multer";
import sharp from "sharp";
import archiver from "archiver";

// Multer setup for serverless (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  await runMiddleware(req, res, upload.single("image"));

  let parts = parseInt(req.body.parts, 10);
  if (isNaN(parts) || parts < 2) parts = 7;

  try {
    const inputBuffer = req.file.buffer;
    const metadata = await sharp(inputBuffer).metadata();
    const { width, height } = metadata;
    const cropHeight = Math.floor(height / parts);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="parts.zip"');

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (let i = 0; i < parts; i++) {
      const buffer = await sharp(inputBuffer)
        .extract({ left: 0, top: i * cropHeight, width, height: cropHeight })
        .toBuffer();
      archive.append(buffer, { name: `part_${i + 1}.jpg` });
    }

    await archive.finalize();
  } catch (err) {
    res.status(500).send("Error processing image.");
  }
}
