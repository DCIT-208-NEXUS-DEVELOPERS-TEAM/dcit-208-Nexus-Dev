import { Router } from "express";

let s3Enabled = false;
try {
  require.resolve("@aws-sdk/client-s3");
  s3Enabled = true;
} catch {}

const router = Router();

if (!s3Enabled) {
  // Stub so frontend can integrate later without breaking
  router.post("/presign", (_req, res) =>
    res.status(501).json({ message: "S3 not configured" })
  );
  router.post("/complete", (_req, res) =>
    res.status(501).json({ message: "S3 not configured" })
  );
} else {
  // Lightweight presign using @aws-sdk/s3-presigned-post
  const initS3Routes = async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const { createPresignedPost } = await import("@aws-sdk/s3-presigned-post");

    const client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
      },
    });

    router.post("/presign", async (req, res) => {
      const key = `uploads/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}_${req.body.filename ?? "file"}`;
      const result = await createPresignedPost(client, {
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Conditions: [["content-length-range", 0, 10_000_000]], // 10MB
        Expires: 300,
      });
      res.json({ key, ...result });
    });

    router.post("/complete", async (_req, res) => res.json({ ok: true }));
  };

  initS3Routes();
}

export default router;
