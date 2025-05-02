const nodemailer = require('nodemailer');
require('dotenv').config();

class SendMail {
    async send365Email(to, subject, html, text, attachments = [], cc = "", bcc = "") {
        try {
            const from = process.env.MAIL_FROM_ADDRESS;
            const mailTransport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                auth: { 
                    user: process.env.MAIL_FROM_ADDRESS, 
                    pass: process.env.MAIL_PASSWORD 
                },
                secureConnection: true,
                tls: { 
                        ciphers: 'SSLv3',
                        rejectUnauthorized: false

                 }
            });

            await mailTransport.sendMail({
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                replyTo: from,
                subject: subject,
                html: html,
                text: text,
                attachments: attachments
            });
        } catch (err) { 
            console.error(`send365Email: An error occurred: `, err);
        }
    }

    async sendEmail(to, subject, html, text, attachments = [], cc = "", bcc = "") {
        try {
            const from = process.env.MAIL_FROM_ADDRESS;
            const mailTransport = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                auth: { 
                    user: process.env.MAIL_FROM_ADDRESS, 
                    pass: process.env.MAIL_PASSWORD 
                },
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
                html: html,
                text: text,
                attachments: attachments
            });
        } catch (err) { 
            console.error(`sendEmail: An error occurred: `, err);
        }
    }
}

module.exports = new SendMail();




