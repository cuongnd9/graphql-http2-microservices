export default {
  port: process.env.PORT || 50000,
  services: {
    orderService: {
      url: '127.0.0.1:50009',
      subscriptionUrl: 'ws://127.0.0.1:60009',
    },
  },
  apiKey: {
    algorithmEncrypt: process.env.ALGORITHM_ENCRYPT || 'aes-256-cbc',
  },
};
