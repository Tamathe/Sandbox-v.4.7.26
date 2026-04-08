import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, inquiryType, message } = body

    // Basic validation
    if (!name || !email || !message) {
      return Response.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const toEmail = process.env.CONTACT_EMAIL
    const fromEmail = process.env.CONTACT_FROM_EMAIL || 'noreply@resend.dev'

    if (!toEmail || !process.env.RESEND_API_KEY) {
      // If no email configured, still return success (form works, just no email sent)
      console.log('Email not configured. Form submission:', { name, email, company, inquiryType, message })
      return Response.json({ success: true })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const typeLabels: Record<string, string> = {
      nil: 'NIL / Brand Partnership',
      media: 'Media / Press Inquiry',
      speaking: 'Speaking / Appearance',
      general: 'General Inquiry',
    }
    const typeLabel = typeLabels[inquiryType] ?? inquiryType ?? 'General Inquiry'

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      reply_to: email,
      subject: `[Website Inquiry] ${typeLabel} — ${company || name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; background: #f5f5f5; padding: 24px;">
            <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #0033A0 100%); padding: 32px 24px;">
                <p style="color: #00D4FF; font-size: 12px; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 8px;">Kaylee Daniel — Website</p>
                <h1 style="color: white; font-size: 24px; margin: 0;">${typeLabel}</h1>
              </div>
              <div style="padding: 32px 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 100px;">Name</td>
                    <td style="padding: 8px 0; color: #111; font-weight: 600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td>
                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0033A0;">${email}</a></td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Company</td>
                    <td style="padding: 8px 0; color: #111;">${company}</td>
                  </tr>
                  ` : ''}
                </table>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Message</p>
                <p style="color: #111; line-height: 1.7; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="background: #f9f9f9; padding: 16px 24px; border-top: 1px solid #eee;">
                <p style="color: #aaa; font-size: 12px; margin: 0;">Sent from kayleedelta.com contact form</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return Response.json(
      { error: 'Something went wrong. Please try again or email directly.' },
      { status: 500 }
    )
  }
}
