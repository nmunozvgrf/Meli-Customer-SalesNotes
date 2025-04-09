const nodemailer = require('nodemailer'); // --save agregar 
require('dotenv').config();

class sendmail {
    async send365Email(to, subject, html, text, attachments = [], cc = "", bcc = "") {
        try {
            let from = process.env.MAIL_FROM_ADDRESS;
            let mailTransport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                auth: { user: process.env.MAIL_FROM_ADDRESS, pass: process.env.MAIL_PASSWORD },
                secureConnection: true,
                tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
            });

            await mailTransport.sendMail({
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                replyTo: from,
                subject: subject,
                html, 
                text: text,
                attachments: attachments
            });
        } catch (err) { 
            console.error(`send365Email: An error occurred: `, err);
        }
    }
    async sendEmail(to, subject, html, text, attachments = [], cc = "", bcc = "") {
        try {
            let from = process.env.MAIL_FROM_ADDRESS;
            let mailTransport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                auth: { user: process.env.MAIL_FROM_ADDRESS, pass: process.env.MAIL_PASSWORD },
                secure: true,
                tls: { rejectUnauthorized: false }
            });

            await mailTransport.sendMail({
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                replyTo: from,
                subject: subject,
                html,
                text: text,
                attachments: attachments
            });
        } catch (err) { 
            console.error(`SendMail: An error occurred: `, err);
        }
    }
}