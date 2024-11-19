import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';  // AWS SDK v3 imports
import { v4 as uuidv4 } from 'uuid';  // For generating unique todoId
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('createTodo');
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });  // Using DynamoDBClient from SDK v3

const createTodo = async (event) => {
  const { name, dueDate, attachmentUrl } = JSON.parse(event.body);

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

  // Validate the input
  if (!name || !dueDate) {
    logger.error('Name and dueDate are required');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Name and dueDate are required' }),
    };
  }

  // Generate a unique todoId
  const todoId = uuidv4();

  const newTodo = {
    todoId: { S: todoId },
    userId: { S: userId },
    name: { S: name },
    dueDate: { S: dueDate },
    createdAt: { S: new Date().toISOString() },
    done: { BOOL: false },  // Default status
    ...(attachmentUrl && { attachmentUrl: { S: attachmentUrl } })  // Only add attachmentUrl if present
  };

  const params = {
    TableName: process.env.TODOS_TABLE,  // Table name from the environment variable
    Item: newTodo,  // The item to be added to DynamoDB
  };

  try {
    const command = new PutItemCommand(params);
    await dynamoDbClient.send(command);

    const res = {
      todoId: newTodo.todoId.S,
      userId: newTodo.userId.S,
      attachmentUrl: newTodo.attachmentUrl ? newTodo.attachmentUrl.S : null,
      dueDate: newTodo.dueDate.S,
      createdAt: newTodo.createdAt.S,
      name: newTodo.name.S,
      done: newTodo.done.BOOL,
    };

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
