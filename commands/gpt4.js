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

    // ✅ الرد على أي ملصق برمز 👍
    if (message && message.sticker_id) {
      try {
        await sendMessage(senderId, { text: '👍' }, pageAccessToken);
      } catch (error) {
        console.error("Error sending sticker response:", error);
      }
      return;
    }

    // ✅ استقبال الصور وإرسالها إلى الـ API
    if (message?.attachments && message.attachments[0].type === 'image') {
      const imageUrl = message.attachments[0].payload.url;

      try {
        const response = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
          uid: senderId, // إرسال الـ uid مع الصورة
          image: imageUrl
        });

        const apiResponse = response.data?.response || "لم أتمكن من معالجة الصورة.";
        return sendMessage(senderId, { text: apiResponse }, pageAccessToken);

      } catch (error) {
        console.error("Error processing image:", error);
        return sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الصورة.' }, pageAccessToken);
      }
    }

    if (!prompt) {
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);
    }

    // ✅ إدارة سجل المحادثة (آخر 3 رسائل فقط)
    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    // إضافة رسالة المستخدم
    const userMessage = `User: ${prompt}`;
    conversationHistory.get(senderId).push(userMessage);

    // الاحتفاظ بآخر 3 رسائل فقط
    if (conversationHistory.get(senderId).length > 3) {
      conversationHistory.get(senderId).shift();
    }

    try {
      const url = `https://kaiz-apis.gleeze.com/api/chipp-ai?ask=${encodeURIComponent(prompt)}&uid=${senderId}`;
      const response = await axios.get(url);

      const responseText = response.data?.response?.trim() || "لم أتمكن من فهم الإجابة.";
      const imageUrl = responseText.match(/https?:\/\/\S+/)?.[0]; // التحقق من وجود رابط صورة

      if (imageUrl) {
        // ✅ إذا كان الرد يحتوي على رابط صورة، أرسلها مباشرة كمرفق صورة
        await sendMessage(senderId, {
          attachment: {
            type: "image",
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        }, pageAccessToken);
      } else {
        // ✅ إذا لم يكن هناك صورة، أرسل الرد كنص عادي
        await sendMessage(senderId, { text: responseText }, pageAccessToken);
      }

      // إضافة رد البوت إلى سجل المحادثة
      conversationHistory.get(senderId).push(`Bot: ${responseText}`);

      // الاحتفاظ بآخر 3 رسائل فقط
      if (conversationHistory.get(senderId).length > 3) {
        conversationHistory.get(senderId).shift();
      }

      // ✅ إدارة المؤقت لحذف المحادثة بعد 10 دقائق
      if (timeouts.has(senderId)) {
        clearTimeout(timeouts.get(senderId));
      }

      const timeout = setTimeout(() => {
        conversationHistory.delete(senderId);
        timeouts.delete(senderId);
      }, 10 * 60 * 1000); // حذف المحادثة بعد 10 دقائق

      timeouts.set(senderId, timeout);

    } catch (error) {
      console.error("Error fetching data:", error);
      sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
    }
  }
};
