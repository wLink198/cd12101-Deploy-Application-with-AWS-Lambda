import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('generateUploadUrl');

// Initialize the S3 client from SDK v3
const s3 = new S3Client({
    region: 'us-east-1',
    signatureVersion: 'v4'
});

export const svcUpload = async (fileName) => {
    logger.info('On uploading file', { fileName });

    // Define the pre-signed URL parameters
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: fileName,
        ContentType: 'multipart/form-data', // to sync with frontend
    };

    return getSignedUrl(s3, new PutObjectCommand(params), {
        expiresIn: 300, // Set expiration to 5 minutes
    });
}