const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// 上傳到 R2
const uploadToR2 = async (fileBuffer, fileName, mimeType) => {
  const key = `uploads/${Date.now()}-${fileName}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));
  
  return `${process.env.R2_PUBLIC_URL}/${key}`;
};

// 從 R2 刪除
const deleteFromR2 = async (imageUrl) => {
  const key = imageUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');
  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
};

module.exports = { uploadToR2, deleteFromR2 };