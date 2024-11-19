import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('updateTodo');
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

const updateTodo = async (event) => {
  const todoId = event.pathParameters.todoId;  // Get todoId from path parameter
  const { name, dueDate, attachmentUrl, done } = JSON.parse(event.body);  // Extract data from request body

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

  // Validate the input data
  if (!name && !dueDate && !attachmentUrl && done === undefined) {
    logger.error('At least one of name, dueDate, attachmentUrl, or done must be provided');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'At least one of name, dueDate, or done must be provided' }),
    };
  }

  // Prepare update expression and values for DynamoDB
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // If name is provided, add it to the update expression
  if (name) {
    updateExpression.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';  // Use #name as a placeholder for the reserved keyword
    expressionAttributeValues[':name'] = { S: name };
  }

  // If dueDate is provided, add it to the update expression
  if (dueDate) {
    updateExpression.push('#dueDate = :dueDate');
    expressionAttributeNames['#dueDate'] = 'dueDate';  // Using #dueDate as a placeholder
    expressionAttributeValues[':dueDate'] = { S: dueDate };
  }

  // If done is provided, add it to the update expression
  if (done !== undefined) {
    updateExpression.push('#done = :done');
    expressionAttributeNames['#done'] = 'done';  // Using #done as a placeholder
    expressionAttributeValues[':done'] = { BOOL: done };
  }

  // If attachmentUrl is provided, add it to the update expression
  if (attachmentUrl) {
    updateExpression.push('#attachmentUrl = :attachmentUrl');
    expressionAttributeNames['#attachmentUrl'] = 'attachmentUrl';
    expressionAttributeValues[':attachmentUrl'] = { S: `https://my-todo-app-bucket.s3.us-east-1.amazonaws.com/${attachmentUrl}` };
  }

  // Join the update expression parts
  const updateExpressionString = `set ${updateExpression.join(', ')}`;

  // Set the parameters for DynamoDB update operation
  const params = {
    TableName: process.env.TODOS_TABLE,
    Key: {
      userId: { S: userId },
      todoId: { S: todoId },
    },
    UpdateExpression: updateExpressionString,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',  // Return the updated item (although we won't need it in this case)
  };

  try {
    const command = new UpdateItemCommand(params);
    await dynamoDbClient.send(command);

    // Return empty response body for successful update
    return {
      statusCode: 200,
      body: JSON.stringify({}),
    };
  } catch (error) {
    logger.error('Error updating TODO item', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating TODO item' }),
    };
  }
};

export const handler = middy(updateTodo)
  .use(httpErrorHandler()) // Handles HTTP errors and returns proper response
  .use(cors({
    credentials: true, // Allow credentials
  }));
