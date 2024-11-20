import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcUpload } from '../../service/uploadService.mjs';

const logger = createLogger('generateUploadUrl');

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

  try {
    // Generate the pre-signed URL using getSignedUrl
    const uploadUrl = await svcUpload(fileName);

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
