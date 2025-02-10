const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Botly } = require('botly');

const app = express();
app.use(bodyParser.json());

const botly = new Botly({
    accessToken: 'PAGE_ACCESS_TOKEN',
    verifyToken: 'VERIFY_TOKEN'
});

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

function handleMessage(senderId, message) {
    const userMessage = message.text;
    const attachments = message.attachments;

    // التحقق من وجود ملصق
    if (attachments && attachments[0].payload.sticker_id) {
        botly.sendText({ id: senderId, text: "👍" });
        return;
    }

    // استقبال الصور
    if (attachments && attachments[0].type === 'image') {
        botly.sendText({ id: senderId, text: "شكراً لإرسال الصورة!" });
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
        botly.sendText({ id: senderId, text: response.data.response });
    }).catch(error => {
        console.error('API Error:', error);
        botly.sendText({ id: senderId, text: 'حدث خطأ أثناء المعالجة.' });
    });
}

function generateImage(senderId, prompt) {
    axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
        uid: senderId,
        message: prompt
    }).then(response => {
        const imageUrl = response.data.response.match(/https?:\/\/\S+/)[0];
        botly.sendImage({ id: senderId, url: imageUrl });
    }).catch(error => {
        console.error('Image Generation Error:', error);
        botly.sendText({ id: senderId, text: 'تعذر إنشاء الصورة.' });
    });
}

function handlePostback(senderId, postback) {
    botly.sendText({ id: senderId, text: 'تم استقبال طلبك!' });
}

app.listen(3000, () => console.log('Bot is running on port 3000'));
