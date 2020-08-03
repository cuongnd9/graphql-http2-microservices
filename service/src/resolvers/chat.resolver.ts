import { PubSub } from 'graphql-subscriptions';

const CHAT_CHANNEL = 'ABC_XYZ';
let chats = [
  {
    id: '1', from: 'admin', content: 'testing 1', createdAt: '',
  },
  {
    id: '2', from: 'admin', content: 'testing 2', createdAt: '',
  },
  {
    id: '3', from: 'admin', content: 'testing 3', createdAt: '',
  },
  {
    id: '4', from: 'admin', content: 'testing 4', createdAt: '',
  },
];

const resolver = {
  Query: {
    chats: () => chats,
  },

  Mutation: {
    createChat: (_: any, { content, from }: any, { pubsub }: { pubsub: PubSub }) => {
      const id = `_${
        Math.random()
          .toString(36)
          .substr(2, 9)}`;
      const chat = {
        id,
        from,
        content,
        createdAt: new Date().toISOString(),
      };

      chats = [chat, ...chats];
      chats = chats.splice(0, 8);
      pubsub.publish(CHAT_CHANNEL, { messageSent: chat });

      return chat;
    },
  },

  Subscription: {
    messageSent: {
      subscribe: (_: any, ___: any, { pubsub }: { pubsub: PubSub }) => pubsub.asyncIterator(CHAT_CHANNEL),
    },
  },
};

export default resolver;
