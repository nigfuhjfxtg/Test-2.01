const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map(); // تخزين المحادثات لكل مستخدم
const timeouts = new Map(); // تخزين المؤقتات لكل مستخدم

module.exports = {
  name: 'gpt4',
  description: 'Interact with Gemini API with short-term memory',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);

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

    // تحويل المحادثة إلى نص واحد يتم إرساله للـ API
    const fullConversation = conversationHistory.get(senderId).join("\n");

    try {
      const { data } = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(fullConversation)}`);

      // استخراج الإجابة من JSON
      let responseText = data.answer ? data.answer : "لم أتمكن من فهم الإجابة.";

      // إضافة رد البوت إلى سجل المحادثة
      conversationHistory.get(senderId).push(`Bot: ${responseText}`);

      // إرسال الرد للمستخدم
      sendMessage(senderId, { text: responseText }, pageAccessToken);

      // **إعادة ضبط المؤقت لكل رسالة جديدة**
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
      console.error("Error fetching data:", error);
      sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
    }
  }
};
