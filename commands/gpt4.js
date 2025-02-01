const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'gpt4',
  description: 'Interact with Gemini API',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Usage: gpt4 <question>" }, pageAccessToken);

    try {
      const { data } = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(prompt)}`);

      // تحويل الاستجابة إلى نص UTF-8 آمن
      let responseText = typeof data === "string" ? data : JSON.stringify(data);
      responseText = responseText.trim(); // إزالة أي مسافات غير ضرورية

      sendMessage(senderId, { text: responseText }, pageAccessToken);
    } catch (error) {
      console.error("Error fetching data:", error);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};
