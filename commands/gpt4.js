const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map();
const timeouts = new Map();

module.exports = {
  name: 'gpt4',
  description: 'التفاعل مع واجهة GPT-4 API',
  usage: 'gpt4 [رسالتك]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: gpt4 <سؤالك>" }, pageAccessToken);

    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    let chatHistory = conversationHistory.get(senderId);
    chatHistory.push(`User: ${prompt}`);

    if (chatHistory.length > 6) {
      chatHistory.shift();
    }

    const fullConversation = chatHistory.join("\n");

    try {
      const { data } = await axios.get(`https://kaiz-apis.gleeze.com/api/gpt-4o?ask=${encodeURIComponent(fullConversation)}&uid=${senderId}&webSearch=off`);

      let responseText = data.answer ? data.answer.replace(/Image of.*?/g, '').trim() : "لم أتمكن من فهم الإجابة.";

      chatHistory.push(`Bot: ${responseText}`);

      if (chatHistory.length > 6) {
        chatHistory.shift();
      }

      await sendMessage(senderId, { text: responseText }, pageAccessToken);

      if (data.web_images && data.web_images.length > 0) {
        for (let imageUrl of data.web_images) {
          await sendMessage(senderId, {
            attachment: {
              type: "image",
              payload: { url: imageUrl, is_reusable: true }
            }
          }, pageAccessToken);
        }
      }

      if (timeouts.has(senderId)) {
        clearTimeout(timeouts.get(senderId));
      }

      const timeout = setTimeout(() => {
        conversationHistory.delete(senderId);
        timeouts.delete(senderId);
      }, 10 * 60 * 1000);

      timeouts.set(senderId, timeout);

    } catch (error) {
      console.error("Error fetching data:", error);
      sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
    }
  }
};
