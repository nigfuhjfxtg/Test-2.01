const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = new Map();
const timeouts = new Map();

// هنا يمكنك تحديد الشخصية التي تريدها
const persona = "أنت الآن تتقمص شخصية شرلوك هولمز، المحقق العبقري. تكلم بأسلوب تحليلي ودقيق، واسأل أسئلة ذكية للكشف عن التفاصيل المفقودة.";

// الدالة الأساسية للتفاعل مع المستخدم
module.exports = {
  name: 'gpt4',
  description: 'Interact with Gemini API with role-playing',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);

    if (!conversationHistory.has(senderId)) {
      conversationHistory.set(senderId, []);
    }

    // إضافة التعليمات في بداية المحادثة إذا كانت أول رسالة
    let chatHistory = conversationHistory.get(senderId);
    if (chatHistory.length === 0) {
      chatHistory.push(`Instruction: ${persona}`);
    }

    // إضافة رسالة المستخدم
    chatHistory.push(`User: ${prompt}`);

    // الاحتفاظ بآخر 5 رسائل فقط
    if (chatHistory.length > 6) {
      chatHistory.shift();
    }

    // تحويل المحادثة إلى نص واحد ليتم إرساله للـ API
    const fullConversation = chatHistory.join("\n");

    try {
      const { data } = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(fullConversation)}`);

      let responseText = data.answer ? data.answer : "لم أتمكن من فهم الإجابة.";
      
      // إضافة رد البوت إلى السجل
      chatHistory.push(`Bot: ${responseText}`);

      // الاحتفاظ فقط بآخر 5 رسائل بعد رد البوت
      if (chatHistory.length > 6) {
        chatHistory.shift();
      }

      sendMessage(senderId, { text: responseText }, pageAccessToken);

      // إعادة ضبط المؤقت لحذف المحادثة بعد 10 دقائق
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
