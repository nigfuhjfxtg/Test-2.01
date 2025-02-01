const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = {}; // تخزين المحادثات حسب المستخدم

module.exports = {
  name: 'gpt4',
  description: 'Interact with Gemini API with short-term memory',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);

    // استرجاع المحادثة السابقة إن وجدت
    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }

    // إضافة الرسالة إلى سجل المحادثة
    conversationHistory[senderId].push(prompt);

    // الاحتفاظ فقط بآخر 20 رسالة للحفاظ على الأداء
    if (conversationHistory[senderId].length > 20) {
      conversationHistory[senderId].shift(); // حذف الأقدم
    }

    // إنشاء محادثة متواصلة
    const fullConversation = conversationHistory[senderId].join("\n");

    try {
      const { data } = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(fullConversation)}`);

      // استخراج الإجابة فقط من JSON
      let responseText = data.answer ? data.answer : "لم أتمكن من فهم الإجابة.";

      // إضافة الرد إلى المحادثة
      conversationHistory[senderId].push(responseText);

      // إرسال الرد للمستخدم
      sendMessage(senderId, { text: responseText }, pageAccessToken);

      // مسح المحادثة بعد 10 دقائق
      setTimeout(() => {
        delete conversationHistory[senderId];
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error("Error fetching data:", error);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
