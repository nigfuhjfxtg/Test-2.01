const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'YOUR_PAGE_ACCESS_TOKEN';  // ضع توكن صفحة فيسبوك هنا

// مصفوفة لحفظ آخر 3 رسائل لكل مستخدم
const userHistory = {};

// دالة إرسال الرسائل إلى فيسبوك
async function sendMessage(senderId, message) {
  try {
    await axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      recipient: { id: senderId },
      message: message
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// دالة التعامل مع الرسائل
async function handleMessage(senderId, message) {
  const prompt = message.text || (message.attachments && message.attachments[0].payload.url) || 'رسالة غير معروفة';

  // حفظ المحادثة
  if (!userHistory[senderId]) {
    userHistory[senderId] = [];
  }
  userHistory[senderId].push(prompt);

  // الاحتفاظ بآخر 3 رسائل فقط
  if (userHistory[senderId].length > 3) {
    userHistory[senderId].shift();
  }

  const historyText = userHistory[senderId].join('\n');

  const payload = {
    uid: senderId,
    ask: prompt,
    history: historyText
  };

  try {
    const response = await axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', payload);
    console.log("API Response:", response.data);

    const responseText = response.data?.response?.trim() || "لم أتمكن من فهم الإجابة.";
    await sendMessage(senderId, { text: responseText });
  } catch (error) {
    console.error("API Error:", error.response ? error.response.data : error.message);

    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    await sendMessage(senderId, { text: `حدث خطأ أثناء معالجة الطلب:\n${errorDetails}` });
  }
}

// نقطة استقبال الرسائل من فيسبوك
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message) {
        handleMessage(senderId, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// تحقق من صحة التوكن عند إعداد الويب هوك
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'YOUR_VERIFY_TOKEN'; // ضع توكن التحقق الخاص بك هنا

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// بدء الخادم
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
