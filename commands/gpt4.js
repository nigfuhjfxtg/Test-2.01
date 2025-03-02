const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// استخدام Map لتخزين المحادثات للمستخدمين
const conversations = new Map();

module.exports = {
  name: 'handleMessage',
  description: 'Process incoming messages and send chatbot response',
  usage: 'handleMessage <senderId> <message>',
  author: 'System',
  execute(senderId, message, pageAccessToken) {
    // حفظ الرسالة في محادثة المستخدم
    if (!conversations.has(senderId)) {
      conversations.set(senderId, []);
    }
    const msgs = conversations.get(senderId);
    msgs.push(message);
    // الاحتفاظ بآخر 10 رسائل فقط
    if (msgs.length > 10) {
      msgs.shift();
    }
    conversations.set(senderId, msgs);

    // إرسال الرسالة إلى API الخاص بالبوت
    axios.post('https://kaiz-apis.gleeze.com/api/chipp-ai', {
      uid: senderId,
      message: message
    })
    .then(response => {
      const reply = response.data.response || 'No response available.';
      sendMessage(senderId, { text: reply }, pageAccessToken);
    })
    .catch(error => {
      console.error('API Error:', error.response ? error.response.data : error.message);
      sendMessage(senderId, { text: 'An error occurred. Please try again later.' }, pageAccessToken);
    });
  }
};
