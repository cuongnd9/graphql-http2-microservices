import { makeExecutableSchema } from 'graphql-tools';
import resolver from './chat.resolver';
import typeDef from "./chat.typeDef";
import typeDefs from "../../../service/src/typeDefs";
import resolvers from "../../../service/src/resolvers";

const schema = makeExecutableSchema({ typeDefs: [typeDef], resolvers: [resolver] });

export { schema };
