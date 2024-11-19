import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('getTodos');
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const getTodos = async (event) => {
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

  const params = {
    TableName: process.env.TODOS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: userId },
    },
  };

  try {
    const result = await dynamoDbClient.send(new QueryCommand(params));
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

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (error) {
    logger.error('Error fetching todos', { error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching todos' }),
    };
  }
};

// Apply middleware
export const handler = middy(getTodos)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));