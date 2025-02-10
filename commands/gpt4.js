const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map(); // حفظ سجل المحادثات
const timeouts = new Map(); // إدارة مؤقت حذف السجل

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

    // ✅ إدارة سجل المحادثة (إنشاء سجل جديد إذا لم يكن موجود)
    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    const userHistory = conversationHistory.get(senderId);

    // ✅ استقبال الصور ومعالجتها مع السجل السابق
    if (message?.attachments && message.attachments[0].type === 'image') {
      const imageUrl = message.attachments[0].payload.url;

      // إضافة الصورة لسجل المحادثة
      userHistory.push({ type: 'image', content: imageUrl });
      if (userHistory.length > 3) userHistory.shift(); // الاحتفاظ بآخر 3 رسائل فقط

      try {
        const response = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
          uid: senderId,
          history: userHistory, // إرسال سجل المحادثة
          image: imageUrl
        });

        const apiResponse = response.data?.response || "لم أتمكن من معالجة الصورة.";
        return sendMessage(senderId, { text: apiResponse }, pageAccessToken);

      } catch (error) {
        console.error("Error processing image:", error);
        return sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الصورة.' }, pageAccessToken);
      }
    }

    // ✅ معالجة الرسائل النصية
    if (prompt) {
      // إضافة النص لسجل المحادثة
      userHistory.push({ type: 'text', content: prompt });
      if (userHistory.length > 3) userHistory.shift(); // الاحتفاظ بآخر 3 رسائل فقط

      try {
        const response = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
          uid: senderId,
          ask: prompt,
          history: userHistory // إرسال سجل المحادثة
        });

        const responseText = response.data?.response?.trim() || "لم أتمكن من فهم الإجابة.";
        const imageUrl = responseText.match(/https?:\/\/\S+/)?.[0]; // التحقق من وجود رابط صورة

        if (imageUrl) {
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
          await sendMessage(senderId, { text: responseText }, pageAccessToken);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        return sendMessage(senderId, { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' }, pageAccessToken);
      }
    }

    // ✅ إدارة مؤقت حذف سجل المحادثة بعد 10 دقائق
    if (timeouts.has(senderId)) {
      clearTimeout(timeouts.get(senderId));
    }

    const timeout = setTimeout(() => {
      conversationHistory.delete(senderId);
      timeouts.delete(senderId);
    }, 10 * 60 * 1000);

    timeouts.set(senderId, timeout);
  }
};
