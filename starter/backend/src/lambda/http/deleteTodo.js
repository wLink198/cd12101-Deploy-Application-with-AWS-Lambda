import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('deleteTodo');
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

const deleteTodo = async (event) => {
  const todoId = event.pathParameters.todoId;  // Get todoId from path parameter

  // Get the userId from the JWT token (auth0Authorizer should have already validated the token)
  const userId = event.requestContext.authorizer.principalId;
  logger.info('Processing deleteTodo request', { userId });

  if (!userId) {
    logger.error('User not authenticated');
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'User not authenticated for deleting todo' }),
    };
  }

  // Set up the parameters for DynamoDB delete operation
  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: {
      userId: { S: userId },
      todoId: { S: todoId },
    },
  };

  try {
    const command = new DeleteItemCommand(params);
    await dynamoDbClient.send(command);

    // Return an empty response body for successful delete
    return {
      statusCode: 200,
      body: JSON.stringify({}),
    };
  } catch (error) {
    logger.error('Error deleting TODO item', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error deleting TODO item' }),
    };
  }
};

export const handler = middy(deleteTodo)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
