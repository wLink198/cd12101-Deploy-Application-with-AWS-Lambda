import { DynamoDBClient, PutItemCommand, UpdateItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';  // AWS SDK v3 imports

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });  // Using DynamoDBClient from SDK v3

export const repoCreate = async (params) => {
    const command = new PutItemCommand(params);
    await dynamoDbClient.send(command);
}

export const repoUpdate = async (params) => {
    const command = new UpdateItemCommand(params);
    await dynamoDbClient.send(command);
}

export const repoDelete = async (params) => {
    const command = new DeleteItemCommand(params);
    await dynamoDbClient.send(command);
}

export const repoList = async (params) => {
    const command = new QueryCommand(params);
    return dynamoDbClient.send(command);
}