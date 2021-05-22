const {google} = require("googleapis");
const nodemailer = require("nodemailer");


const CLIENT_ID = '613177288048-gr0d8ghbhhtm96sam9ck9e852ljfmqqi.apps.googleusercontent.com';
const CLIENT_SECRET = 'rJtxfQu3utTQA15ecDvpefV2';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04TkZX0k8YR2KCgYIARAAGAQSNwF-L9Ir6Uo2ur094zTTD0tpKK43S8ChmTlIU1vYH2wq_97ezlDiDG7PF_nLmyUq8M9u0xS0ZAQ';

const OAuth2Client = new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET,REDIRECT_URI);
OAuth2Client.setCredentials({refresh_token:REFRESH_TOKEN});


async function sendEmail ({to, subject, text, html}) {
    try {
        const accessToken = await OAuth2Client.getAccessToken(); 

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth:{
                type : "OAuth2",
                user: "gh.abds@gmail.com",
                clientId : CLIENT_ID,
                clientSecret : CLIENT_SECRET,
                refreshToken : REFRESH_TOKEN,
                accessToken: accessToken,
                debug: true,
                logger: true
            }
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port:465,
            secure: true, // true for 465, false for other ports
            logger: true,
            debug: true,
            secureConnection: false,
            auth: {
                user: 'gh.abds@gmail.com', // generated ethereal user
                pass: 'StreamingPassword2020', // generated ethereal password
            },
            tls:{
                rejectUnAuthorized:true
            }
        })

        const options = {
            from : "<contact@antigaspi.dz>",
            to,
            subject,
            text,
            html
        }

        const result = await transport.sendMail(options);
        return result;
    } catch (e) {
        return e.message;
    }
}



module.exports = {
    sendEmail
}