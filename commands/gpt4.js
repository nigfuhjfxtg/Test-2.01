const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map();
const timeouts = new Map();

module.exports = {
  name: 'gpt4',
  description: 'Interact with Kaiz API with short-term memory',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, message) {
    const prompt = args.join(' ');

    // ✅ الرد على رمز الإعجاب (👍) كنص أو زر الإعجاب الأزرق
    if (
      prompt === '👍' ||                         // نص عادي
      (message?.sticker_id === 369239263222822) // زر الإعجاب الأزرق في ماسنجر
    ) {
      return sendMessage(senderId, { text: '👍' }, pageAccessToken);
    }

    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
    }

    // إدارة سجل المحادثة
    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }
    conversationHistory.get(senderId).push(`User: ${prompt}`);

    if (conversationHistory.get(senderId).length > 20) {
      conversationHistory.get(senderId).shift();
    }

    try {
      // === استخدام API الجديد ===
      const url = `https://kaiz-apis.gleeze.com/api/chipp-ai?ask=${encodeURIComponent(prompt)}&uid=${senderId}`;

      const response = await axios.get(url);

      const responseText = response.data?.answer || "لم أتمكن من فهم الإجابة.";
      conversationHistory.get(senderId).push(`Bot: ${responseText}`);

      sendMessage(senderId, { text: responseText }, pageAccessToken);

      // إدارة مؤقت حذف المحادثة
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
