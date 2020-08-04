import { graphqlHTTP2 } from 'grpc-graphql-sdk';

import graphql, { schema } from './graphql';
import { config, updateSchemaForGateway } from './components';

const main = async () => {
  try {
    graphqlHTTP2({
      port: config.port,
      graphql,
      subscription: {
        port: config.subscriptionPort,
        schema,
      },
    });
    // await updateSchemaForGateway().catch(() => console.error('update schema gateway error'));
  } catch (e) {
    console.error(e, 'global error');
  }
};

main();
