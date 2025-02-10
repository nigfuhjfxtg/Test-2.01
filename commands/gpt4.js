const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const API_URL = 'https://kaiz-apis.gleeze.com/api/chipp-ai';
const PAGE_ACCESS_TOKEN = 'YOUR_PAGE_ACCESS_TOKEN'; // استبدله بالتوكن الخاص بك

// مصفوفة لحفظ المحادثات حسب معرف المستخدم
const conversations = {};

// حفظ الرسائل في المصفوفة
function saveMessage(userId, message) {
    if (!conversations[userId]) {
        conversations[userId] = [];
    }

    conversations[userId].push(message);

    // الاحتفاظ بآخر 10 رسائل فقط لتجنب تجاوز السعة
    if (conversations[userId].length > 10) {
        conversations[userId].shift();
    }
}

// إرسال الرسالة عبر Messenger
async function sendMessage(recipientId, message) {
    await axios.post(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientId },
        message: typeof message === 'string' ? { text: message } : message
    });
}

// معالجة الرسائل الواردة
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async function(entry) {
            const webhookEvent = entry.messaging[0];
            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message) {
                const message = webhookEvent.message;

                // إذا كانت الرسالة نصية
                if (message.text) {
                    saveMessage(senderId, message.text);

                    try {
                        const response = await axios.post(API_URL, {
                            uid: senderId,
                            message: message.text
                        });
                        await sendMessage(senderId, response.data.response);
                    } catch (error) {
                        await sendMessage(senderId, 'حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى لاحقًا.');
                    }
                }

                // إذا كانت صورة
                if (message.attachments && message.attachments[0].type === 'image') {
                    const imageUrl = message.attachments[0].payload.url;

                    try {
                        const response = await axios.post(API_URL, {
                            uid: senderId,
                            image: imageUrl
                        });
                        await sendMessage(senderId, response.data.response);
                    } catch (error) {
                        await sendMessage(senderId, 'حدث خطأ أثناء تحليل الصورة.');
                    }
                }

                // إذا كان ملصق
                if (message.sticker_id) {
                    await sendMessage(senderId, { text: '👍' });
                }
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// نقطة النهاية للتحقق من الـ webhook
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = 'YOUR_VERIFY_TOKEN'; // استبدله بالتوكين الخاص بك
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
