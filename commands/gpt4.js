const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversations = new Map();

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

    if (!conversations.has(senderId)) {
      conversations.set(senderId, []);
    }

    const userMessages = conversations.get(senderId);
    userMessages.push({ role: 'user', content: prompt });

    try {
      const { data } = await axios.post('https://kaiz-apis.gleeze.com/api/gpt-4o', {
        messages: userMessages,
        uid: senderId,
        webSearch: 'off'
      });

      const botResponse = data.response || 'No response received.';
      userMessages.push({ role: 'bot', content: botResponse });

      conversations.set(senderId, userMessages);

      sendMessage(senderId, { text: botResponse }, pageAccessToken);

    } catch (error) {
      console.error('Error fetching GPT-4o response:', error.message);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
