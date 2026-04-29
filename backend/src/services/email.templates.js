/**
 * Email Templates
 *
 * Bilingual (TR/EN) transactional templates returned as { subject, html, text }.
 */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function passwordResetEmail({ name, resetUrl, locale = 'en' }) {
  const safeName = name ? escapeHtml(name) : '';
  const safeUrl = escapeHtml(resetUrl);

  if (locale === 'tr') {
    const subject = 'StudyAI — Şifre sıfırlama isteği';
    const greeting = safeName ? `Merhaba ${safeName},` : 'Merhaba,';
    const text = [
      greeting,
      '',
      'StudyAI hesabınız için bir şifre sıfırlama isteği aldık.',
      'Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (1 saat boyunca geçerli):',
      '',
      resetUrl,
      '',
      'Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.',
      '',
      '— StudyAI',
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <h2 style="color:#111;">Şifre sıfırlama</h2>
        <p>${greeting}</p>
        <p>StudyAI hesabınız için bir şifre sıfırlama isteği aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsiniz. Bağlantı <strong>1 saat</strong> boyunca geçerlidir.</p>
        <p style="text-align:center;margin:32px 0;">
          <a href="${safeUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Şifremi sıfırla</a>
        </p>
        <p style="font-size:12px;color:#666;">Buton çalışmıyorsa şu bağlantıyı tarayıcınıza yapıştırın:<br><span style="word-break:break-all;">${safeUrl}</span></p>
        <p style="font-size:12px;color:#666;">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
        <p style="font-size:12px;color:#666;">— StudyAI</p>
      </div>
    `;
    return { subject, html, text };
  }

  const subject = 'StudyAI — Reset your password';
  const greeting = safeName ? `Hi ${safeName},` : 'Hi,';
  const text = [
    greeting,
    '',
    'We received a request to reset the password for your StudyAI account.',
    'Click the link below to choose a new password (valid for 1 hour):',
    '',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email.",
    '',
    '— StudyAI',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
      <h2 style="color:#111;">Reset your password</h2>
      <p>${greeting}</p>
      <p>We received a request to reset the password for your StudyAI account. Click the button below to choose a new one. The link is valid for <strong>1 hour</strong>.</p>
      <p style="text-align:center;margin:32px 0;">
        <a href="${safeUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Reset password</a>
      </p>
      <p style="font-size:12px;color:#666;">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all;">${safeUrl}</span></p>
      <p style="font-size:12px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#666;">— StudyAI</p>
    </div>
  `;
  return { subject, html, text };
}

module.exports = { passwordResetEmail };
