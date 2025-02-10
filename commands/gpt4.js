const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map(); // تخزين المحادثات لكل مستخدم
const timeouts = new Map(); // تخزين المؤقتات لكل مستخدم

module.exports = {
  name: 'gpt4',
  description: 'Interact with Chipp AI API with short-term memory',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, message) {
    try {
      // التحقق من وجود message و attachments لتجنب الأخطاء
      if (message && message.message && message.message.attachments &&
          message.message.attachments[0] &&
          message.message.attachments[0].payload &&
          message.message.attachments[0].payload.sticker_id) {
        return sendMessage(senderId, { text: "👍" }, pageAccessToken);
      }

      const prompt = args.join(' ');
      if (!prompt) {
        return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
      }

      // استرجاع المحادثة السابقة أو إنشاء محادثة جديدة
      if (!conversationHistory.has(senderId)) {
        conversationHistory.set(senderId, []);
      }

      // إضافة رسالة المستخدم إلى السجل
      conversationHistory.get(senderId).push(`User: ${prompt}`);

      // تحديد الحد الأقصى لعدد الرسائل للحفاظ على الأداء
      if (conversationHistory.get(senderId).length > 20) {
        conversationHistory.get(senderId).shift(); // حذف الأقدم
      }

      const { data } = await axios.get(`https://kaiz-apis.gleeze.com/api/chipp-ai`, {
        params: {
          ask: prompt,
          uid: senderId
        }
      });

      // استخراج الإجابة من JSON
      let responseText = data.response ? data.response : "لم أتمكن من فهم الإجابة.";

      // إضافة رد البوت إلى سجل المحادثة
      conversationHistory.get(senderId).push(`Bot: ${responseText}`);

      // إرسال الرد للمستخدم
      sendMessage(senderId, { text: responseText }, pageAccessToken);

      // إعادة ضبط المؤقت لكل رسالة جديدة
      if (timeouts.has(senderId)) {
        clearTimeout(timeouts.get(senderId)); // إلغاء المهلة السابقة
      }

      // ضبط مهلة حذف المحادثة بعد 10 دقائق من آخر رسالة
      const timeout = setTimeout(() => {
        conversationHistory.delete(senderId);
        timeouts.delete(senderId);
      }, 10 * 60 * 1000);

      timeouts.set(senderId, timeout);

    } catch (error) {
      console.error("Error:", error);
      sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
    }
  }
};
