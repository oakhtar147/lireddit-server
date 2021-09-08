import nodemailer from "nodemailer";

export default async function sendEmail(to: string, html: string) {
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: "wkdmcxsowxommky3@ethereal.email",
      pass: 'PPFxtn8U7M5CeMBn2a', 
    },
  });

  const info = await transporter.sendMail({
    to,
    html,
    from: 'lireddit@bot.com',
    subject: "Reset your password",
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}