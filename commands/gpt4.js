const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// استخدام Map لتخزين المحادثات
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

    // التحقق من وجود محادثة سابقة أو إنشاء محادثة جديدة
    if (!conversations.has(senderId)) {
      conversations.set(senderId, []);
    }

    try {
      // إضافة سؤال المستخدم إلى المحادثة
      const userMessages = conversations.get(senderId);
      userMessages.push({ role: 'user', content: prompt });

      // طلب الرد من API
      const { data } = await axios.get('https://kaiz-apis.gleeze.com/api/gpt-4o', {
        params: {
          ask: prompt,
          uid: senderId,
          webSearch: 'off'
        }
      });

      const botResponse = data.response || 'No response received.';

      // إضافة رد البوت
      userMessages.push({ role: 'bot', content: botResponse });

      // تحديث المحادثة في Map
      conversations.set(senderId, userMessages);

      // إرسال الرد إلى المستخدم
      sendMessage(senderId, { text: botResponse }, pageAccessToken);

    } catch (error) {
      console.error('Error fetching GPT-4o response:', error.message);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
