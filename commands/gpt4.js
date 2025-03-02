const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const API_URL = 'https://kaiz-apis.gleeze.com/api/chipp-ai';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN';

// استخدام Map لتخزين المحادثات بشكل أكثر أمانًا وكفاءة
const conversations = new Map();

// دالة لحفظ الرسائل لمستخدم معين
function saveMessage(userId, message) {
  // إذا لم يكن هناك سجل لهذا المستخدم، أنشئ مصفوفة جديدة
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  
  // احصل على مصفوفة الرسائل الحالية للمستخدم
  const messages = conversations.get(userId);
  messages.push(message);
  
  // الاحتفاظ بآخر 10 رسائل فقط لتجنب تجاوز السعة
  if (messages.length > 10) {
    messages.shift();
  }
  
  // تحديث الكائن Map (غير ضروري عند التعامل مع المصفوفة لكن للتأكيد)
  conversations.set(userId, messages);
}

// دالة لإرسال الرسالة عبر Messenger
async function sendMessage(recipientId, message) {
  try {
    await axios.post(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      recipient: { id: recipientId },
      message: typeof message === 'string' ? { text: message } : message
    });
  } catch (error) {
    console.error('Error sending message:', error.response ? error.response.data : error.message);
  }
}

// معالجة الرسائل الواردة
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender && webhookEvent.sender.id;
      
      if (!senderId) continue;
      
      if (webhookEvent.message) {
        const message = webhookEvent.message;
        // معالجة الرسائل النصية
        if (message.text) {
          saveMessage(senderId, message.text);
          try {
            const response = await axios.post(API_URL, {
              uid: senderId,
              message: message.text
            });
            await sendMessage(senderId, response.data.response || 'لا توجد استجابة.');
          } catch (error) {
            await sendMessage(senderId, 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.');
          }
        }
        // معالجة الرسائل التي تحتوي على مرفقات صورة
        if (message.attachments && message.attachments[0].type === 'image') {
          const imageUrl = message.attachments[0].payload.url;
          try {
            const response = await axios.post(API_URL, {
              uid: senderId,
              image: imageUrl
            });
            await sendMessage(senderId, response.data.response || 'لا توجد استجابة.');
          } catch (error) {
            await sendMessage(senderId, 'حدث خطأ أثناء تحليل الصورة.');
          }
        }
        // الرد على الملصقات بإرسال رمز 👍
        if (message.sticker_id) {
          await sendMessage(senderId, { text: '👍' });
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// نقطة النهاية للتحقق من الـ webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'YOUR_VERIFY_TOKEN';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
