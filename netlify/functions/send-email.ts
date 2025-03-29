import { Handler } from '@netlify/functions';
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

export const handler: Handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { email, data } = JSON.parse(event.body || '{}');

  if (!email || !data) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Email and data are required' })
    };
  }

  try {
    const documentTable = data.map((doc: any) => {
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};