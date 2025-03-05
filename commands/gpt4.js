const axios = require("axios");
const { sendMessage } = require('../handles/sendMessage');
const NodeCache = require("node-cache"); // إضافة حزمة لإدارة التخزين المؤقت

// تهيئة التخزين المؤقت بــ TTL (30 دقيقة) وفحص دوري كل 5 دقائق
const conversationCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });

module.exports = {
  name: 'gpt4',
  description: 'التفاعل مع GPT-4o',
  usage: 'gpt4 [رسالتك]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, { text: "استخدام: gpt4 <سؤالك>" }, pageAccessToken);
    }

    // استرجاع المحادثة من التخزين المؤقت أو إنشاء جديدة
    let userMessages = conversationCache.get(senderId) || [];
    
    // تحديد سعة المحادثة (آخر 10 رسائل)
    if (userMessages.length >= 10) {
      userMessages = userMessages.slice(-9); // الاحتفاظ بالحد الأقصى
    }

    userMessages.push({ role: 'user', content: prompt });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // مهلة 30 ثانية

      const { data } = await axios.post(
        'https://kaiz-apis.gleeze.com/api/gpt-4o',
        {
          messages: userMessages,
          uid: senderId,
          webSearch: 'off'
        },
        { signal: controller.signal } // إرفاق إشارة الإلغاء
      );

      clearTimeout(timeout);

      const botResponse = data.response || 'لم أتلقَ ردًا.';
      userMessages.push({ role: 'bot', content: botResponse });

      // تحديث التخزين المؤقت مع TTL تلقائي
      conversationCache.set(senderId, userMessages);

      sendMessage(senderId, { text: botResponse }, pageAccessToken);

    } catch (error) {
      console.error('خطأ في الاتصال بالخادم:', error.message);
      let errorMessage = 'حدث خطأ. يرجى المحاولة لاحقًا.';
      
      if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
        errorMessage = "انتهت مهلة الطلب. يرجى إعادة المحاولة بطلب أقصر.";
      }

      sendMessage(senderId, { text: errorMessage }, pageAccessToken);
    }
  }
};
