const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const botly = require('botly');  // استيراد المكتبة بدون { }

const app = express();
app.use(bodyParser.json());

const bot = botly({
    accessToken: 'PAGE_ACCESS_TOKEN',  // استبدال بـ TOKEN الصحيح
    verifyToken: 'VERIFY_TOKEN'  // استبدال بـ VERIFY TOKEN الصحيح
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
        bot.sendText(senderId, "👍");
        return;
    }

    // استقبال الصور
    if (attachments && attachments[0].type === 'image') {
        bot.sendText(senderId, "شكراً لإرسال الصورة!");
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
        bot.sendText(senderId, response.data.response);
    }).catch(error => {
        console.error('API Error:', error);
        bot.sendText(senderId, 'حدث خطأ أثناء المعالجة.');
    });
}

function generateImage(senderId, prompt) {
    axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
        uid: senderId,
        message: prompt
    }).then(response => {
        const imageUrl = response.data.response.match(/https?:\/\/\S+/)[0];
        
        // إرسال الصورة مباشرة
        bot.sendImage(senderId, imageUrl);
    }).catch(error => {
        console.error('Image Generation Error:', error);
        bot.sendText(senderId, 'تعذر إنشاء الصورة.');
    });
}

function handlePostback(senderId, postback) {
    bot.sendText(senderId, 'تم استقبال طلبك!');
}

app.listen(3000, () => console.log('Bot is running on port 3000'));
