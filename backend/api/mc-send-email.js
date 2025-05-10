const nodemailer = require('nodemailer');

const sendEmail = async (req, res) => {
  const { to, subject, body } = req.body;
  console.log('Received send-email request:', { to, subject, body });

  if (!to || !subject || !body) {
    console.error('Missing required fields:', { to, subject, body });
    return res.status(400).json({ error: 'Missing required fields: to, subject, and body are required.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error.message, error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};

module.exports = { sendEmail };