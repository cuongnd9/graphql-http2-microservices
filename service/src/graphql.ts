import { graphql } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { PubSub } from 'graphql-subscriptions';

import typeDefs from './typeDefs';
import resolvers from './resolvers';
import { handleResponse, handleError } from './components';

const formatVariables = (variables: any[]) => {
  return variables.length === 0 ? {} : variables.reduce((obj, variable) => ({
    ...obj,
    [variable.key]: variable.value,
  }), {});
};

const callGraphql = async (req: any, callback: Function) => {
  try {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const result = await graphql(
      schema,
      req.query,
      resolvers,
      {
        pubsub: new PubSub(),
      },
      formatVariables(JSON.parse(req.variables  || '[]'))
    );
    if (result.errors) {
      return handleError(null, result.errors[0], callback);
    }
    handleResponse(null, result.data, callback);
  } catch (error) {
    handleError(null, error, callback);
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

export { schema };
export default callGraphql;
