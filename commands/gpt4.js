const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'gpt4',
  description: 'Interact with GPT-4o',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
    }

    try {
      const { data } = await axios.get('https://kaiz-apis.gleeze.com/api/gpt-4o', {
        params: {
          ask: prompt,
          uid: senderId,
          webSearch: 'off'
        }
      });

      sendMessage(senderId, { text: data.response || 'No response received.' }, pageAccessToken);
    } catch (error) {
      console.error('Error fetching GPT-4o response:', error.message);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
