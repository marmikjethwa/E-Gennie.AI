const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch'); // Required for direct API calls to list models

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔥 Generate Email with Gemini Pro
// 🔥 Generate Email with Gemini Pro
app.post('/api/generate-email', async (req, res) => {
    try {
        const { bulletPoints, subject } = req.body;
        if (!bulletPoints || !subject) {
            return res.status(400).json({ error: 'Bullet points and subject are required' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); 

        const prompt = `Convert the following bullet points into a professional, well-structured email.

Subject: ${subject}

Bullet Points:
${bulletPoints}

Instructions:
- Write only the email body (no subject line)
- Start with an appropriate greeting
- Convert bullet points into flowing paragraphs
- End with a professional closing
- Keep the tone professional but friendly
- Make sure the content is well-organized and easy to read`;

        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }]
        });

        // --- IMPORTANT DEBUGGING AND ERROR HANDLING ---
        // Log the full result from Gemini for inspection
        console.log('Full Gemini API Result:', JSON.stringify(result, null, 2));

        // ⭐⭐⭐ THE FIX IS HERE ⭐⭐⭐
        // The text content is under candidates[0].content.parts[0].text
        if (!result.response || !result.response.candidates || result.response.candidates.length === 0 || 
            !result.response.candidates[0].content || !result.response.candidates[0].content.parts || 
            result.response.candidates[0].content.parts.length === 0) 
        {
            // Check for safety ratings if parts are empty (still good to have)
            if (result.response && result.response.promptFeedback && result.response.promptFeedback.safetyRatings) {
                const safetyIssues = result.response.promptFeedback.safetyRatings.map(sr => `${sr.category}: ${sr.probability}`).join(', ');
                console.warn('Gemini response was blocked due to safety settings:', safetyIssues);
                return res.status(400).json({
                    error: 'Gemini could not generate email due to safety concerns or empty response.',
                    details: 'No content generated. Check prompt for sensitive topics or try rephrasing. Safety Ratings: ' + safetyIssues
                });
            } else {
                console.warn('Gemini response was empty or malformed with no specific feedback.');
                return res.status(500).json({
                    error: 'Gemini generated an empty or unexpected response.',
                    details: 'The AI did not return any readable content. This could be due to an issue with the prompt or the model.'
                });
            }
        }

        // ⭐⭐⭐ THIS IS THE LINE TO CORRECTLY EXTRACT TEXT ⭐⭐⭐
        const responseText = result.response.candidates[0].content.parts[0].text;
        res.json({ success: true, emailContent: responseText.trim() });

    } catch (error) {
        console.error('Gemini email generation error:', error); 
        res.status(500).json({
            error: 'Failed to generate email with Gemini',
            details: error.message
        });
    }
});


// 📤 Send email via Nodemailer
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, cc, bcc, subject, body, senderEmail, senderPassword } = req.body;

        if (!to || !subject || !body || !senderEmail || !senderPassword) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, body, senderEmail, senderPassword' });
        }

        // Create a new transporter for each request using the user's credentials
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: senderEmail,
                pass: senderPassword
            },
            socketTimeout: 20000
        });

        // Verify transporter before sending
        await transporter.verify();

        const mailOptions = {
    from: senderEmail,
    to,
    subject,
    html: `
        ${body.replace(/\n/g, '<br>')}
        <br><br>
        <hr>
        <p style="font-size: 0.9em; color: gray;">
            Found this email cool? You can generate one for yourself too — just visit 
            <a href="https://e-gennieai.up.railway.app/" target="_blank">
                https://e-gennieai.up.railway.app
            </a>.
        </p>
    `
};


        if (cc && cc.trim()) mailOptions.cc = cc;
        if (bcc && bcc.trim()) mailOptions.bcc = bcc;

        console.log('Sending email:', { from: senderEmail, to, subject });

        const info = await transporter.sendMail(mailOptions);
        res.json({
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('Error sending email:', error);
        let errorMessage = 'Failed to send email';

        if (error.code === 'EAUTH') {
            errorMessage = 'Authentication failed. Check the Gmail and App Password.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'SMTP server not found.';
        } else if (error.responseCode === 535) {
            errorMessage = 'Invalid Gmail credentials.';
        }

        res.status(500).json({ error: errorMessage, details: error.message });
    }
});

// ✅ Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        ollamaUp: false // Set to false by default, as we're not checking it directly here.
                        // You'd need a separate check for Ollama.
    });
});


// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email Composer ready!`);
});

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, () => {
        console.log(`${sig} received, shutting down gracefully`);
        process.exit(0);
    });
});