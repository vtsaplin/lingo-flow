import { Storage } from "@google-cloud/storage";
import * as fs from "fs";
import * as path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

async function uploadContent() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    console.error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
    process.exit(1);
  }

  const bucket = storage.bucket(bucketId);
  const dataDir = path.join(process.cwd(), "data");

  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".md"));

  for (const filename of files) {
    const filePath = path.join(dataDir, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const destination = `content/${filename}`;

    const file = bucket.file(destination);
    await file.save(content, {
      contentType: "text/markdown",
    });

    console.log(`Uploaded: ${filename} -> ${destination}`);
  }

  console.log("Done!");
}

uploadContent().catch(console.error);
