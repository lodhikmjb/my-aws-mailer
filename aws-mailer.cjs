const express = require('express');
const nodemailer = require('nodemailer');
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- SECURE LOGIN CONFIGURATION ---
const USERNAME = "admin"; 
const PASSWORD = "your-secure-password"; // Is password ko aap badal sakte hain

// --- LOGIN API ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME && password === PASSWORD) {
        return res.status(200).json({ success: true, message: "Login Successful" });
    } else {
        return res.status(401).json({ success: false, message: "Invalid Username or Password" });
    }
});

// --- AWS SES BULK MAILER API ---
app.post('/api/send-bulk-aws', async (req, res) => {
    const { awsAccessKey, awsSecretKey, awsRegion, fromEmail, emails, subject, htmlContent } = req.body;

    if (!awsAccessKey || !awsSecretKey || !awsRegion || !fromEmail || !emails || !subject || !htmlContent) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // AWS SES Client Setup
    const sesClient = new SESClient({
        region: awsRegion,
        credentials: {
            accessKeyId: awsAccessKey,
            secretAccessKey: awsSecretKey,
        },
    });

    const transporter = nodemailer.createTransport({
        SES: { ses: sesClient, aws: { SendRawEmailCommand } },
    });

    let successCount = 0;
    let failureCount = 0;
    let failedEmails = [];

    // Send emails one by one for maximum deliverability
    for (const toEmail of emails) {
        try {
            await transporter.sendMail({
                from: fromEmail,
                to: toEmail,
                subject: subject,
                html: htmlContent,
            });
            successCount++;
        } catch (error) {
            failureCount++;
            failedEmails.push({ email: toEmail, error: error.message });
        }
    }

    res.status(200).json({
        message: "Bulk mailing process completed",
        successCount,
        failureCount,
        failedEmails
    });
});

// --- PORT CONFIGURATION FOR RENDER ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`AWS Server running on port ${PORT}`);
});
