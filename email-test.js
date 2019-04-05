const {
    SMTPMailer
} = require("./lib/mailer");


async function sendTestEMail() {
    try {
        const mailer = new SMTPMailer({
            host: 'smtp.gsa.gov',
            port: 587
        });
        const html = "Please ignore";
        await mailer.sendMail({
            from: 'code-engineering@gsa.gov',
            to: 'amin.mehr@gsa.gov,ricardo.reyes@gsa.com',
            subject: "[CODE.GOV] Test E-Mail, **Ignore**",
            html: html
        });
    } catch (error) {
        console.log(error)
    }
}

sendTestEMail();