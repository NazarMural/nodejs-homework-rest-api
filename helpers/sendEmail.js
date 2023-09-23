const nodemailer = require("nodemailer");

const { META_PASSWORD, USER_EMAIL } = process.env;

const nademailerConfig = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: USER_EMAIL,
    pass: META_PASSWORD,
  },
};

const transport = nodemailer.createTransport(nademailerConfig);

const sendEmail = async (data) => {
  const email = {
    ...data,
    from: USER_EMAIL,
  };
  await transport.sendMail(email);
  return true;
};

module.exports = sendEmail;
