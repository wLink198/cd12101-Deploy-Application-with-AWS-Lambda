import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcUpdate } from '../../service/todoService.mjs';
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

// Capture AWS SDK requests for tracing
AWSXRay.captureAWS(AWS);

const logger = createLogger('updateTodo');

const updateTodo = async (event) => {
  // Start a new subsegment for this Lambda request
  const segment = AWSXRay.getSegment();

  const todoId = event.pathParameters.todoId;  // Get todoId from path parameter

  // Get the userId from the JWT token (auth0Authorizer should have already validated the token)
  const userId = event.requestContext.authorizer.principalId;
  logger.info('Processing updateTodo request', { userId });

  if (!userId) {
    logger.error('User not authenticated');
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'User not authenticated for updating todo' }),
    };
  }

  try {
    await svcUpdate({ ...JSON.parse(event.body), todoId: todoId, userId: userId })

    segment.addAnnotation('todo updated', { todoId, userId });

    // Return empty response body for successful update
    return {
      statusCode: 200,
      body: JSON.stringify({}),
    };
  } catch (error) {
    logger.error('Error updating TODO item', error);
    segment.addError(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating TODO item' }),
    };
  } finally {
    // End the subsegment for this function execution
    if (segment) {
      segment.close();
    }
  }
};

export const handler = middy(updateTodo)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
