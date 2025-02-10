const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'PAGE_ACCESS_TOKEN'; // استبدل بالتوكن الصحيح

// إرسال طلب إلى Facebook Send API
function callSendAPI(senderId, messageData) {
    return axios.post(`https://graph.facebook.com/v12.0/me/messages`, {
        recipient: { id: senderId },
        message: messageData
    }, {
        params: { access_token: PAGE_ACCESS_TOKEN }
    });
}

// استقبال الطلبات من Webhook
app.post('/webhook', (req, res) => {
    const data = req.body;

    if (data.object === 'page') {
        data.entry.forEach(entry => {
            entry.messaging.forEach(event => {
                const senderId = event.sender.id;

                if (event.message) {
                    handleMessage(senderId, event.message);
                } else if (event.postback) {
                    handlePostback(senderId, event.postback);
                }
            });
        });
    }
    res.sendStatus(200);
});

// التعامل مع الرسائل
function handleMessage(senderId, message) {
    const userMessage = message.text;
    const attachments = message.attachments;

    // التحقق من وجود ملصق
    if (attachments && attachments[0].payload && attachments[0].payload.sticker_id) {
        callSendAPI(senderId, { text: "👍" });
        return;
    }

    // استقبال الصور وإرسالها إلى الـ API
    if (attachments && attachments[0].type === 'image') {
        const imageUrl = attachments[0].payload.url;

        axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
            uid: senderId,
            image: imageUrl // إرسال رابط الصورة إلى الـ API
        }).then(response => {
            callSendAPI(senderId, { text: response.data.response }); // إرسال رد الـ API
        }).catch(error => {
            console.error('API Error:', error);
            callSendAPI(senderId, { text: 'حدث خطأ أثناء معالجة الصورة.' });
        });

        return;
    }

    // التحقق من طلب إنشاء صورة
    if (userMessage && userMessage.includes('انشئ صورة')) {
        generateImage(senderId, userMessage);
        return;
    }

    // إرسال الرسالة إلى API مع uid لحفظ المحادثة
    axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
        uid: senderId,
        message: userMessage
    }).then(response => {
        callSendAPI(senderId, { text: response.data.response });
    }).catch(error => {
        console.error('API Error:', error);
        callSendAPI(senderId, { text: 'حدث خطأ أثناء المعالجة.' });
    });
}

// إنشاء صورة وإرسالها
function generateImage(senderId, prompt) {
    axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
        uid: senderId,
        message: prompt
    }).then(response => {
        const imageUrl = response.data.response.match(/https?:\/\/\S+/)[0];
        
        // إرسال الصورة مباشرة باستخدام Send API
        callSendAPI(senderId, {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl,
                    is_reusable: true
                }
            }
        });
    }).catch(error => {
        console.error('Image Generation Error:', error);
        callSendAPI(senderId, { text: 'تعذر إنشاء الصورة.' });
    });
}

// التعامل مع postbacks
function handlePostback(senderId, postback) {
    callSendAPI(senderId, { text: 'تم استقبال طلبك!' });
}

// بدء تشغيل الخادم
app.listen(3000, () => console.log('Bot is running on port 3000'));
