import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'FamilyForecast <notifications@familyforecast.app>'

export async function sendEmail(to: string, subject: string, body: string) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured.')
    }

    const isHtml = /<[a-z][\s\S]*>/i.test(body)
    const html = isHtml ? body : `<p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`

    const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject,
        text: body,
        html,
    })

    if (error) throw new Error(error.message)
    return { success: true, message: `Email sent to ${to}` }
}
