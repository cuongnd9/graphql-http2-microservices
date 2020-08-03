const typeDef = `
  extend type Query {
    chats: [Chat]
  }
  extend type Mutation {
    createChat(content: String!, from: String!) : Chat
  }
  type Subscription {
    messageSent: Chat
  }
  type Chat {
    id: ID!
    content: String!
    from: String!
    createdAt: String!
  }
`;

export default typeDef;
