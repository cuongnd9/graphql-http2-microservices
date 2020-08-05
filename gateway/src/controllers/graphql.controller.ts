import { Request, Response } from 'express';
import { GraphQLSchema, execute, parse } from 'graphql';
import { BaseController } from '../components';

class GraphqlController extends BaseController {
  index(req: Request, res: Response) {
    const { query, variables }: { query: string, variables: any } = req.body;
    return execute(req.app.locals.schema, parse(query), null, { req, res }, variables);
  }
}

export default GraphqlController;
