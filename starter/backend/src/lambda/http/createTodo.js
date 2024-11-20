import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { createLogger } from '../../utils/logger.mjs';
import { svcCreate } from '../../service/todoService.mjs';

const logger = createLogger('createTodo');

const createTodo = async (event) => {
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

    // Return the newly created TODO record
    return {
      statusCode: 200,
      body: JSON.stringify({ res }),
    };
  } catch (error) {
    logger.error('Error creating TODO item', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error creating TODO item' }),
    };
  }
};

export const handler = middy(createTodo)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
