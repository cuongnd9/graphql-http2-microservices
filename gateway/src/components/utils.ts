import ws from 'ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';

import { Request, Response, NextFunction } from 'express';
import { server, credentials } from 'grpc-graphql-sdk';
import { get } from 'lodash';
import { GraphQLSchema, DocumentNode, ExecutionResult } from 'graphql';
import crypto from 'crypto';
import { ReadStream, writeFileSync } from 'fs';

import {
  AppError, ServiceError, ParserError, AuthenticationError,
} from './errors';

type Operation = {
  query: DocumentNode;
  operationName?: string;
  variables?: any;
  context?: {
    graphqlContext?: {
      req?: any;
      res?: any;
    };
  };
}

const streamToString = (stream: ReadStream): Promise<any[]> => {
  const chunks: any[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(chunks))
  })
};

const formatVariables = (variables: any) => {
  return !variables ? {} : Promise.all(Object.keys(variables).map(async (key: any) => ({
    key,
    value: !Array.isArray(variables[key]) ? {
      ...variables[key].file,
      createReadStream: variables[key].file && Buffer.concat(await streamToString(variables[key].file.createReadStream())),
    } : await Promise.all(variables[key].map(async (item: any) => ({
      ...(await item.promise),
      createReadStream: (await item.promise) && Buffer.concat(await streamToString((await item.promise).createReadStream())),
    }))),
  })));
}

export const relay = (url: string) => (operation: Operation) => new Promise<ExecutionResult>(async (resolve, reject) => {
  console.log('----------------start-------------------')
  const definition = getMainDefinition(operation.query);
  if (definition.kind === 'OperationDefinition' && definition.operation === 'subscription') {
    console.log('-------tada-------------')
    const client = new SubscriptionClient('127.0.0.1:60009', { reconnect: true }, ws);
    const executionResult = await client.request(operation);
    const error = get(executionResult, 'error');
    if (error) {
      const parsedError = JSON.parse(error);
      const extensions = get(parsedError, 'extensions');
      const message = get(parsedError, 'message');
      const locations = get(parsedError, 'locations');
      return reject(new ParserError(message, extensions, locations));
    }
    const data = get(executionResult, 'data');
    if (!data) {
      return reject(new ServiceError(`${url} is not found`));
    }
    resolve({ data: JSON.parse(data) });
  }
  const client = new server(url, credentials.createInsecure(), {
    'grpc.max_receive_message_length': 1024 * 1024 * 100,
    'grpc.max_send_message_length': 1024 * 1024 * 100,
  });
  const graphqlContext = get(operation, 'context.graphqlContext');
  const req = get(graphqlContext, 'req');
  client.callRequest({
    headers: JSON.stringify(req.headers),
    query: req.body.query,
    variables: !req.body.variables ? [] : JSON.stringify(await formatVariables(req.body.variables)),
  }, (_: any, response: any) => {
    const error = get(response, 'error');
    if (error) {
      const parsedError = JSON.parse(error);
      const extensions = get(parsedError, 'extensions');
      const message = get(parsedError, 'message');
      const locations = get(parsedError, 'locations');
      return reject(new ParserError(message, extensions, locations));
    }
    const data = get(response, 'data');
    if (!data) {
      return reject(new ServiceError(`${url} is not found`));
    }
    resolve({ data: JSON.parse(data) });
  });
});

export const getSchema = (url: string) => new Promise<GraphQLSchema>((resolve, reject) => {
  const client = new server(url, credentials.createInsecure());
  client.callRequest({ query: '{ getSchema }' }, (_: any, response: any) => {
    const error = get(response, 'error');
    if (error) {
      return reject(error);
    }
    const data = get(response, 'data');
    if (!data) {
      return reject(new ServiceError(`${url} is not found`));
    }
    const parsedData = JSON.parse(data).getSchema || '';
    resolve(parsedData.replace('getSchema: String', ''));
  });
});

export const wrapAsync = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const handleError = (
  err: AppError,
  _: Request,
  res: Response,
  next: NextFunction
) => {
  const { message, code, ...rest } = err;
  res.status(200).json({
    errors: [
      {
        code,
        message,
        ...rest,
      },
    ],
  });
  next();
};

export const encryptKey = (publicKey: string, symmetricKey: string) => crypto.publicEncrypt({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_PADDING,
}, Buffer.from(symmetricKey, 'utf8')).toString('base64');

export const decryptKey = (publicKey: string, encryptedKey: string) => crypto.publicDecrypt({
  key: publicKey,
  padding: crypto.constants.RSA_PKCS1_PADDING,
}, Buffer.from(encryptedKey, 'base64')).toString('utf8');

export const encryptData = (data: any, symmetricKey: string, iv: string, algorithm: string) => {
  const cipher = crypto.createCipheriv(algorithm, symmetricKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
};

export const decryptData = (encryptedData: any, symmetricKey: string, iv: string, algorithm: string) => {
  const decipher = crypto.createDecipheriv(algorithm, symmetricKey, iv);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const decryptRequest = (data: any, publicKey: string, algorithm: string) => {
  const { encryptedData, encryptedKey } = data;
  if (!encryptedData || !encryptedKey) {
    throw new AuthenticationError('encrypted data, encrypted key cannot null');
  }
  try {
    const { key, iv } = JSON.parse(decryptKey(publicKey, encryptedKey));
    const decryptedData = decryptData(encryptedData, key, iv, algorithm);
    return decryptedData;
  } catch (error) {
    throw new AuthenticationError(error.message);
  }
};
