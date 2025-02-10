const axios = require('axios');

// حفظ آخر 3 رسائل لكل مستخدم
const userHistory = {};

async function handleMessage(senderId, message, pageAccessToken) {
  const prompt = message.text || 'رسالة غير معروفة';

  // حفظ المحادثة
  if (!userHistory[senderId]) {
    userHistory[senderId] = [];
  }
  userHistory[senderId].push(prompt);

  // الاحتفاظ بآخر 3 رسائل فقط
  if (userHistory[senderId].length > 3) {
    userHistory[senderId].shift();
  }

  // تحويل المحادثة لنص لتجنب مشاكل المصفوفات
  const historyText = userHistory[senderId].join('\n');

  const payload = {
    uid: senderId,
    ask: prompt,
    history: historyText
  };

  try {
    const response = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', payload);
    const responseText = response.data?.response?.trim() || "لم أتمكن من فهم الإجابة.";

    // إرسال الرد للمستخدم
    await sendMessage(senderId, { text: responseText }, pageAccessToken);
  } catch (error) {
    console.error("API Error:", error.response ? error.response.data : error.message);

    // عرض رسالة خطأ تفصيلية لتسهيل تتبع المشكلة
    const errorMessage = error.response?.data?.error || error.message || "حدث خطأ أثناء معالجة الطلب.";
    await sendMessage(senderId, { text: `خطأ: ${errorMessage}` }, pageAccessToken);
  }
}

// دالة إرسال الرسائل إلى فيسبوك
async function sendMessage(senderId, message, pageAccessToken) {
  try {
    await axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`, {
      recipient: { id: senderId },
      message: message
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

module.exports = { handleMessage };
