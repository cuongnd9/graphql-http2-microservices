import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe, GraphQLSchema } from 'graphql';

import express, { Express } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import expressPlayground from 'graphql-playground-middleware-express';
import { graphqlUploadExpress } from 'graphql-upload';
import cors from 'cors';
import { schema } from './chat';

import { makeRemoteExecutableSchema, mergeSchemas } from 'graphql-tools';
import {
  handleError, getSchema, executor, subscriber, config,
} from './components';
import { GraphqlController, SchemaController } from './controllers';

const createApp = async () => {
  const app: Express = express();

  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const schemas: GraphQLSchema[] = await Promise.all(
    Object.values(config.services).map(async (service) => makeRemoteExecutableSchema({
      schema: await getSchema(service.url),
      executor: await executor(service.url),
      subscriber: subscriber(service.subscriptionUrl),
    }))
  );
  app.locals.schema = mergeSchemas({ schemas: [...schemas, schema] });

  const graphqlController = new GraphqlController();
  const schemaController = new SchemaController();

  app.get('/', expressPlayground({
    endpoint: '/',
    subscriptionEndpoint: '/',
  }));
  app.post('/', graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }), graphqlController.action('index'));
  app.put('/schema', schemaController.action('update'));

  app.use(handleError);

  return app;
};

const main = async () => {
  const app = await createApp();
  const server = createServer(app);

  server.listen(config.port, () => {
    console.log(`🚀 Server ready at http://127.0.0.1:${config.port}`);
    console.log(`🚀 Subscriptions ready at ws://127.0.0.1:${config.port}`);
    SubscriptionServer.create({
      execute,
      subscribe,
      schema: app.locals.schema,
    }, {
      server,
      path: '/',
    });
  });
};

main().catch((error) => console.log('Global error', error));
