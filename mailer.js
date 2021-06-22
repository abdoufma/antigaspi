const nodemailer = require("nodemailer");

async function sendEmail ({to, subject, text, html}) {
    try {
        const transport = nodemailer.createTransport({
            host: 'pro.icosnethosting.com',
            port: 465,
            auth: {
                user: 'info@devlog.dz',
                pass: 'Jwe$55Zo'
            }
        })

        const options = {
            from : "No Relpy <info@devlog.dz>",
            to,
            subject,
            text,
            html
        }

        return await transport.sendMail(options);
    } catch (e) {
        return e.message;
    }
}



module.exports = {
    sendEmail
}