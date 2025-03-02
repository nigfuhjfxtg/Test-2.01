const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map();
const timeouts = new Map();

const persona = "أنت الآن تتقمص شخصية شرلوك هولمز، المحقق العبقري. تكلم بأسلوب تحليلي ودقيق، واسأل أسئلة ذكية للكشف عن التفاصيل المفقودة.";

module.exports = {
  name: 'gpt4',
  description: 'Interact with Gemini API with images support',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt)
      return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);

    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    let chatHistory = conversationHistory.get(senderId);
    if (chatHistory.length === 0) {
      chatHistory.push(`Instruction: ${persona}`);
    }

    chatHistory.push(`User: ${prompt}`);

    if (chatHistory.length > 6) {
      chatHistory.shift();
    }

    const fullConversation = chatHistory.join("\n");

    try {
      // استخدام الرابط الجديد للـ API مع POST
      const { data } = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
        uid: senderId,
        message: fullConversation
      });

      // إزالة "Image of ..." من الإجابة
      let responseText = data.response
        ? data.response.replace(/Image of.*?/g, '').trim()
        : "لم أتمكن من فهم الإجابة.";

      chatHistory.push(`Bot: ${responseText}`);

      if (chatHistory.length > 6) {
        chatHistory.shift();
      }

      // إرسال النص أولاً
      await sendMessage(senderId, { text: responseText }, pageAccessToken);

      // إرسال الصور مباشرة إذا كانت متاحة
      if (data.web_images && data.web_images.length > 0) {
        for (let imageUrl of data.web_images) {
          await sendMessage(
            senderId,
            {
              attachment: {
                type: "image",
                payload: { url: imageUrl, is_reusable: true }
              }
            },
            pageAccessToken
          );
        }
      }

      // ضبط مؤقت حذف المحادثة بعد 10 دقائق
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
      sendMessage(
        senderId,
        { text: 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.' },
        pageAccessToken
      );
    }
  }
};
