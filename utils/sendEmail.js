const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, htmlText, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'rajpootwasay77@gmail.com',
        pass: process.env.EMAIL_PASS || 'scijfnpukjvhmrtl',
      },
    });

    const recipientEmail = (to || '').trim().toLowerCase();

    const mailOptions = {
      from: `"Foundit Security" <${process.env.EMAIL_USER || 'rajpootwasay77@gmail.com'}>`,
      to: recipientEmail,
      subject,
      text: text || 'Your Foundit Security Code',
      html: htmlText,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email Sent Successfully to ${recipientEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Email Sending Error: ${error.message}`);
    return false;
  }
};

module.exports = sendEmail;
