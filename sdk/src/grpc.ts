import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { join } from 'path';
import grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';

type Subscription = {
  port: number | string;
  schema: any;
}
type GraphqlHTTP2Options = {
  port: number | string;
  graphql: Function;
  subscription?: Subscription;
  environment?: string;
};

const PROTO_PATH = join(__dirname, 'protos/server.proto');
const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
const serverProto: any = grpc.loadPackageDefinition(packageDefinition).server;
const callRequest = (graphql: Function) => (call: any, callback: Function) => {
  graphql(call.request, callback);
};
const server = serverProto.Server;
/**
 * Start GraphQL server with HTTP2 protocol.
 *
 * @param {object} options Options are provided to start the server
 */
const graphqlHTTP2 = (options: GraphqlHTTP2Options): void => {
  const { port, graphql, subscription } = options;
  const server = new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 100,
    'grpc.max_send_message_length': 1024 * 1024 * 100,
  });
  server.addService(serverProto.Server.service, { callRequest: callRequest(graphql) });
  server.bind(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log(`🚀 Server ready at http://127.0.0.1:${port}`);

  if (subscription) {
    const websocketServer = createServer((request, response) => {
      response.writeHead(404);
      response.end();
    });
    websocketServer.listen(subscription.port, () => {
      new SubscriptionServer({
        execute,
        subscribe,
        schema: subscription.schema,
      }, {
        server: websocketServer,
        path: '/',
      });
      console.log(`🚀 Subscriptions ready at ws://127.0.0.1:${subscription.port}`);
    });
  }
};

export { credentials } from 'grpc';
export { server, graphqlHTTP2 };
