import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcUpload } from '../../service/uploadService.mjs';
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

// Capture AWS SDK requests for tracing
AWSXRay.captureAWS(AWS);

const logger = createLogger('generateUploadUrl');

const generateUploadUrl = async (event) => {
  // Start a new subsegment for this Lambda request
  const segment = AWSXRay.getSegment();

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

    segment.addAnnotation('file uploaded', fileName);

    // Return the pre-signed URL in the response
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: uploadUrl,
      }),
    };
  } catch (error) {
    logger.error('Error generating upload URL', error);
    segment.addError(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error generating upload URL' }),
    };
  } finally {
    // End the subsegment for this function execution
    if (segment) {
      segment.close();
    }
  }
};

export const handler = middy(generateUploadUrl)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
