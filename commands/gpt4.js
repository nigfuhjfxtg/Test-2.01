const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversations = new Map();

module.exports = {
  name: 'gpt4',
  description: 'Interact with GPT-4o',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    // إذا كان المستخدم أرسل ملصق (نفترض أنه يُرسل الكلمة "sticker" للملصقات)
    if (args.length === 1 && args[0].toLowerCase() === 'sticker') {
      return sendMessage(senderId, { text: '👍' }, pageAccessToken);
    }
    
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
    }
    
    // التحقق مما إذا كانت الرسالة تحتوي على رابط لصورة (png, jpg, jpeg, gif)
    const imagePattern = /(?:https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i;
    if (imagePattern.test(prompt)) {
      // لن نقوم بتخزين الرسالة إذا كانت صورة، ويمكنك تعديل الرد كما تريد
      return sendMessage(senderId, { text: "Image messages are not stored." }, pageAccessToken);
    }

    // التأكد من وجود سجل محادثة للمستخدم
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
