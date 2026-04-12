import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (toEmail, verifyLink) => {
  await transporter.sendMail({
    from: `"Lumi" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Xác thực tài khoản của bạn',
    html: `
      <h2>Xác thực email</h2>
      <p>Click vào link bên dưới để xác thực tài khoản:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>Link hết hạn sau 24 giờ.</p>
    `,
  });
};

export const sendResetPasswordEmail = async (toEmail, resetUrl) => {
  await transporter.sendMail({
    from: `"Lumi" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào nút bên dưới:</p>
        <a href="${resetUrl}"
           style="display:inline-block; padding:12px 24px; background:#4F46E5;
                  color:white; text-decoration:none; border-radius:6px; margin:16px 0;">
          Đặt lại mật khẩu
        </a>
        <p style="color:#666; font-size:14px;">Link hết hạn sau <strong>30 phút</strong>.</p>
        <p style="color:#666; font-size:14px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};