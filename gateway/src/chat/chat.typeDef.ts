const typeDef = `
  type Query {
    chats2: [Chat2]
  }
  type Mutation {
    createChat2(content: String!, from: String!) : Chat2
  }
  type Subscription {
    messageSent2: Chat2
  }
  type Chat2 {
    id: ID!
    content: String!
    from: String!
    createdAt: String!
  }
`;

export default typeDef;
