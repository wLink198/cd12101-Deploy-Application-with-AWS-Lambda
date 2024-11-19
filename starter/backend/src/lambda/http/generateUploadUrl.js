import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('generateUploadUrl');

// Initialize the S3 client from SDK v3
const s3 = new S3Client({
  region: 'us-east-1',
  signatureVersion: 'v4'
});

const generateUploadUrl = async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  logger.info('Processing generateUploadUrl request', { userId });

  if (!userId) {
    logger.error('User not authenticated');
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "User not authenticated for uploading todo's attachment" }),
    };
  }

  const todoId = event.pathParameters.todoId;  // Get todoId from path parameter

  // Generate a unique file name for the attachment
  const fileName = `${todoId}.png`;

  // Define the pre-signed URL parameters
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
    ContentType: 'multipart/form-data', // to sync with frontend
  };

  try {
    // Generate the pre-signed URL using getSignedUrl
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand(params), {
      expiresIn: 300, // Set expiration to 5 minutes
    });

    // Return the pre-signed URL in the response
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: uploadUrl,
      }),
    };
  } catch (error) {
    logger.error('Error generating upload URL', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error generating upload URL' }),
    };
  }
};

export const handler = middy(generateUploadUrl)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
