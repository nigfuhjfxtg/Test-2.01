const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map();
const timeouts = new Map();

module.exports = {
  name: 'gpt4',
  description: 'Interact with Blackbox AI API with short-term memory',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, message) {
    const prompt = args.join(' ');

    // ✅ التحقق إذا كانت الرسالة عبارة عن "👍" كنص أو زر الإعجاب الأزرق
    if (
      prompt === '👍' ||                         // نص عادي
      (message.sticker_id === 369239263222822)  // زر الإعجاب الأزرق في فيسبوك (Sticker ID)
    ) {
      return sendMessage(senderId, { text: '👍' }, pageAccessToken);
    }

    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
    }

    // استرجاع المحادثة السابقة أو إنشاء محادثة جديدة
    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    // إضافة رسالة المستخدم إلى السجل
    conversationHistory.get(senderId).push(`User: ${prompt}`);

    if (conversationHistory.get(senderId).length > 20) {
      conversationHistory.get(senderId).shift();
    }

    try {
      const url = "https://www.blackbox.ai/api/chat";
      const data = {
        id: senderId,
        messages: [{ id: senderId, content: prompt, role: "user" }],
        agentMode: {},
        validated: "00f37b34-a166-4efb-bce5-1312d87f2f94",
      };

      const headers = {
        "Content-Type": "application/json",
        Accept: "*/*",
        Origin: "https://www.blackbox.ai",
        Referer: "https://www.blackbox.ai/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      };

      const response = await axios.post(url, data, { headers });

      const responseText = response.data?.message || "لم أتمكن من فهم الإجابة.";
      conversationHistory.get(senderId).push(`Bot: ${responseText}`);

      sendMessage(senderId, { text: responseText }, pageAccessToken);

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
