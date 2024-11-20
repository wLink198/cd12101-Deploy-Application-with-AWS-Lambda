import { v4 as uuidv4 } from 'uuid';  // For generating unique todoId
import { createLogger } from '../utils/logger.mjs';
import { repoCreate, repoDelete, repoList, repoUpdate } from '../repository/todoRepository.mjs';

const logger = createLogger('createTodoService');
const tableName = process.env.TODOS_TABLE;  // Table name from the environment variable

export async function svcCreate(req) {
    const { userId, name, dueDate, attachmentUrl } = req;
    logger.info('On creating todo', { userId });

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
        TableName: tableName,
        Item: newTodo,  // The item to be added to DynamoDB
    };

    await repoCreate(params);

    return {
        todoId: newTodo.todoId.S,
        userId: newTodo.userId.S,
        attachmentUrl: newTodo.attachmentUrl ? newTodo.attachmentUrl.S : null,
        dueDate: newTodo.dueDate.S,
        createdAt: newTodo.createdAt.S,
        name: newTodo.name.S,
        done: newTodo.done.BOOL,
    };
}

export async function svcUpdate(req) {
    const { todoId, userId, name, dueDate, attachmentUrl, done } = req;
    logger.info('On updating todo', { userId });

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
        TableName: tableName,
        Key: {
            userId: { S: userId },
            todoId: { S: todoId },
        },
        UpdateExpression: updateExpressionString,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',  // Return the updated item (although we won't need it in this case)
    };

    await repoUpdate(params);
}

export async function svcDelete(req) {
    const { todoId, userId } = req;
    logger.info('On deleting todo', { userId });

    // Set up the parameters for DynamoDB delete operation
    const params = {
        TableName: tableName,
        Key: {
            userId: { S: userId },
            todoId: { S: todoId },
        },
    };

    await repoDelete(params);
}

export async function svcList(req) {
    const { userId } = req;
    logger.info('On listing todo', { userId });

    const params = {
        TableName: tableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': { S: userId },
        },
    };

    return repoList(params);
}