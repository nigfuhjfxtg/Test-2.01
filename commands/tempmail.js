const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const domains = ["rteet.com", "1secmail.com", "1secmail.org", "1secmail.net", "wwjmp.com", "esiix.com", "xojxe.com", "yoggm.com"];

module.exports = {
  name: 'بريد',
  description: 'Generate temporary email and check inbox',
  usage: '-tempmail gen OR -tempmail inbox <email>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const [cmd, email] = args;
    if (cmd === 'فتح') {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return sendMessage(senderId, { text: `📧 | البريد الإلكتروني المؤقت: ${Math.random().toString(36).slice(2, 10)}@${domain}` }, pageAccessToken);
    }

    if (cmd === 'رسائل' && email && domains.some(d => email.endsWith(`@${d}`))) {
      try {
        const [username, domain] = email.split('@');
        const inbox = (await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${username}&domain=${domain}`)).data;
        if (!inbox.length) return sendMessage(senderId, { text: 'صندوق الوارد فارغ.' }, pageAccessToken);

        const { id, from, subject, date } = inbox[0];
        const { textBody } = (await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${username}&domain=${domain}&id=${id}`)).data;
        return sendMessage(senderId, { text: `📬 | آخر البريد الإلكتروني:\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\nContent:\n${textBody}` }, pageAccessToken);
      } catch {
        return sendMessage(senderId, { text: 'خطأ: غير قادر على جلب صندوق الوارد أو محتوى البريد الإلكتروني.' }, pageAccessToken);
      }
    }

    sendMessage(senderId, { text: 'استخدام غير صالح. استخدم -بريد انشاء أو -بريد رسائل <Mail>' }, pageAccessToken);
  },
};
