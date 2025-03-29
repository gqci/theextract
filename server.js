import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

app.post('/api/send-email', async (req, res) => {
  const { email, data } = req.body;

  try {
    // Create HTML table for the document data
    const documentTable = data.map(doc => {
      const fields = Object.entries(doc)
        .filter(([key, value]) => value && key !== 'document_type' && key !== 'documentType')
        .map(([key, value]) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `).join('');

      return `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #2d3748; margin-bottom: 10px;">${doc.document_type || doc.documentType}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">Field</th>
                <th style="padding: 8px; border: 1px solid #ddd; background-color: #f8f9fa;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${fields}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Document Processing Results',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #1a202c; margin-bottom: 20px;">Document Processing Summary</h2>
          ${documentTable}
          <p style="color: #718096; font-size: 14px; margin-top: 20px;">
            This is an automated email from DocAI. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});