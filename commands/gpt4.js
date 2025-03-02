const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// نخزن المحادثات بشكل مؤقت في الذاكرة
const conversationHistory = new Map();
// نخزن مؤقتات لحذف المحادثة بعد فترة
const timeouts = new Map();

module.exports = {
  name: 'gpt4',
  description: 'Interact with GPT-4o API (kaiz-apis) and handle images',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    // ضمّ المعطيات (Args) في نص واحد
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <سؤالك>" }, pageAccessToken);
    }

    // إذا لم تكن هناك محادثة محفوظة لهذا المستخدم، أنشئها
    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    // جلب المحادثة المخزنة
    let chatHistory = conversationHistory.get(senderId);

    // إضافة رسالة المستخدم في النهاية
    chatHistory.push(`User: ${prompt}`);

    // الاحتفاظ بآخر 6 رسائل فقط لتجنب التضخم
    if (chatHistory.length > 6) {
      chatHistory.shift();
    }

    // تحويل المحادثة إلى نص موحّد
    const fullConversation = chatHistory.join('\n');

    try {
      // طلب GET للـ API مع المعاملات المطلوبة
      const { data } = await axios.get('https://kaiz-apis.gleeze.com/api/gpt-4o', {
        params: {
          ask: fullConversation,
          uid: senderId,
          webSearch: 'off' // يمكن تغييره إلى 'on' إذا أردت البحث في الويب
        }
      });

      // تأكد من وجود حقل الرد
      let responseText = data.answer || 'لم أتمكن من فهم الإجابة.';
      // إذا أردت إزالة نصوص زائدة (مثل Image of...) يمكنك استخدام replace/regex هنا
      // responseText = responseText.replace(/Image of.*?/g, '').trim();

      // أضف رسالة البوت إلى المحادثة
      chatHistory.push(`Bot: ${responseText}`);

      // الاحتفاظ بآخر 6 رسائل فقط
      if (chatHistory.length > 6) {
        chatHistory.shift();
      }

      // إرسال الرد كنص
      await sendMessage(senderId, { text: responseText }, pageAccessToken);

      // إذا كانت هناك صور (web_images)، أرسلها للمستخدم
      if (data.web_images && Array.isArray(data.web_images) && data.web_images.length > 0) {
        for (let imageUrl of data.web_images) {
          await sendMessage(
            senderId,
            {
              attachment: {
                type: 'image',
                payload: { url: imageUrl, is_reusable: true }
              }
            },
            pageAccessToken
          );
        }
      }

      // إعادة ضبط المؤقت (10 دقائق) لحذف المحادثة من الذاكرة
      if (timeouts.has(senderId)) {
        clearTimeout(timeouts.get(senderId));
      }
      const timeout = setTimeout(() => {
        conversationHistory.delete(senderId);
        timeouts.delete(senderId);
      }, 10 * 60 * 1000);

      timeouts.set(senderId, timeout);

    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error.message);
      // إذا حدث خطأ، أرسل رسالة تنبيه للمستخدم
      sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
    }
  }
};
