const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'بريد',
  description: 'إنشاء بريد مؤقت والتحقق من صندوق الوارد',
  usage: '-بريد فتح OR -بريد رسائل <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, email] = args;

    if (cmd === 'فتح') {
      try {
        const response = await axios.get('https://zaikyoo-api.onrender.com/api/tmail1-gen');
        const tempEmail = response.data.email; // تأكد من أن الاستجابة تحتوي على هذا الحقل
        return sendMessage(senderId, { text: `📧 | البريد الإلكتروني المؤقت: ${tempEmail}` }, pageAccessToken);
      } catch (error) {
        return sendMessage(senderId, { text: '❌ خطأ: لم أتمكن من إنشاء بريد إلكتروني مؤقت.' }, pageAccessToken);
      }
    }

    if (cmd === 'رسائل' && email) {
      try {
        const inboxResponse = await axios.get(`https://zaikyoo-api.onrender.com/api/tmail1-inbox?email=${email}`);
        const inbox = inboxResponse.data;

        if (!inbox.length) {
          return sendMessage(senderId, { text: '📭 صندوق الوارد فارغ.' }, pageAccessToken);
        }

        const { from, subject, date, textBody } = inbox[0]; // نفترض أن الـ API ترجع بيانات بهذه الحقول
        return sendMessage(senderId, { 
          text: `📬 | آخر بريد إلكتروني:\n\n📧 من: ${from}\n📌 الموضوع: ${subject}\n📅 التاريخ: ${date}\n\n✉ المحتوى:\n${textBody}` 
        }, pageAccessToken);
        
      } catch (error) {
        return sendMessage(senderId, { text: '❌ خطأ: تعذر جلب رسائل البريد الإلكتروني.' }, pageAccessToken);
      }
    }

    sendMessage(senderId, { text: '🚫 استخدام غير صالح. استخدم -بريد فتح أو -بريد رسائل <البريد الإلكتروني>' }, pageAccessToken);
  },
};
