import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcList } from '../../service/todoService.mjs';
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

// Capture AWS SDK requests for tracing
AWSXRay.captureAWS(AWS);

const logger = createLogger('getTodos');

const getTodos = async (event) => {
  // Start a new subsegment for this Lambda request
  const segment = AWSXRay.getSegment();

  // Extract userId from the JWT token (assuming it's available in requestContext.authorizer.principalId)
  const userId = event.requestContext.authorizer.principalId;
  logger.info('Processing getTodos request', { userId });

  if (!userId) {
    logger.error('User not authenticated');
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'User not authenticated for getting todos' }),
    };
  }

  try {
    const result = await svcList({ userId: userId })
    let items = [];

    if (result.Items && result.Items.length > 0) {
      // Map over the result items to match the required response structure
      items = result.Items.map((todo) => ({
        todoId: todo.todoId.S,
        userId: todo.userId.S,
        attachmentUrl: todo.attachmentUrl ? todo.attachmentUrl.S : null,
        dueDate: todo.dueDate.S,
        createdAt: todo.createdAt.S,
        name: todo.name.S,
        done: todo.done.BOOL,
      }));
    }

    segment.addAnnotation('totalTodos', items.length);

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (error) {
    logger.error('Error fetching todos', { error: error.message });
    segment.addError(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching todos' }),
    };
  } finally {
    // End the subsegment for this function execution
    if (segment) {
      segment.close();
    }
  }
};

// Apply middleware
export const handler = middy(getTodos)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));