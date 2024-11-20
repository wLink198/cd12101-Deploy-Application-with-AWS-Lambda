import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcCreate } from '../../service/todoService.mjs';
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

// Capture AWS SDK requests for tracing
AWSXRay.captureAWS(AWS);

const logger = createLogger('createTodo');

const createTodo = async (event) => {
  // Start a new subsegment for this Lambda request
  const segment = AWSXRay.getSegment();

  // Get the userId from the JWT token (auth0Authorizer should have already validated the token)
  const userId = event.requestContext.authorizer.principalId;
  logger.info('Processing createTodo request', { userId });

  if (!userId) {
    logger.error('User not authenticated');
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'User not authenticated for creating todo' }),
    };
  }

  try {
    const res = await svcCreate({ ...JSON.parse(event.body), userId: userId });

    segment.addAnnotation('todo created', { userId });

    // Return the newly created TODO record
    return {
      statusCode: 200,
      body: JSON.stringify({ res }),
    };
  } catch (error) {
    logger.error('Error creating TODO item', error);
    segment.addError(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error creating TODO item' }),
    };
  } finally {
    // End the subsegment for this function execution
    if (segment) {
      segment.close();
    }
  }
};

export const handler = middy(createTodo)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
