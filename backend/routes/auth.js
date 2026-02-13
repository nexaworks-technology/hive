import express from 'express'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { supabase } from '../supabase-client.js'

const router = express.Router()

const MAIL_FROM = process.env.MAIL_FROM || 'hello@nexaworks.tech'
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const CODE_TTL_MINUTES = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 15)
const RESEND_COOLDOWN_SECONDS = Number(process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS || 60)

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
})

const freeDomains = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'gmx.de',
  'mail.com',
  'yandex.com',
  'yandex.ru',
  'zoho.com',
  'pm.me',
  'live.com',
  'msn.com',
])

const isBusinessEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return !freeDomains.has(domain)
}

const generateCode = () => {
  const num = crypto.randomInt(0, 1_000_000)
  return num.toString().padStart(6, '0')
}

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex')

const hashIp = (ip) => (ip ? crypto.createHash('sha256').update(ip).digest('hex') : null)

const sendVerificationEmail = async ({ to, code }) => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP configuration is missing (SMTP_HOST/SMTP_USER/SMTP_PASS).')
  }
  const verifyUrl = `${APP_BASE_URL}/verify?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}`
  const text = `Your Hive verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.\n\nOr click ${verifyUrl} to verify.`
  const html = `<p>Your Hive verification code is <strong>${code}</strong>. It expires in ${CODE_TTL_MINUTES} minutes.</p><p><a href="${verifyUrl}">Click here to verify</a></p>`

  await transporter.sendMail({ from: MAIL_FROM, to, subject: 'Verify your Hive account', text, html })
}

const findUserByEmail = async (email) => {
  const { data, error } = await supabase.auth.admin.getUserByEmail(email)
  if (error) throw error
  return data?.user || null
}

const markExistingCodesConsumed = async (userId) => {
  const { error } = await supabase
    .from('verification_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('consumed_at', null)

  if (error) throw error
}

const issueCode = async ({ userId, ipHash }) => {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabase.from('verification_codes').insert({ user_id: userId, code_hash: codeHash, expires_at: expiresAt, ip_hash: ipHash })
  if (error) throw error
  return { code, expiresAt }
}

const userAlreadyConfirmed = (user) => Boolean(user?.email_confirmed_at || user?.user_metadata?.email_confirmed_at)

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

    const trimmedEmail = String(email).trim().toLowerCase()
    if (!isBusinessEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Use your work email (no personal domains)' })
    }

    const existingUser = await findUserByEmail(trimmedEmail)
    if (existingUser && userAlreadyConfirmed(existingUser)) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    let userId = existingUser?.id

    if (!userId) {
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: false,
      })
      if (createError) {
        console.error('[auth][signup] createUser error', createError)
        return res.status(400).json({ error: createError.message })
      }
      userId = data.user?.id
    }

    if (!userId) return res.status(500).json({ error: 'Failed to create user' })

    await markExistingCodesConsumed(userId)
    const ipHash = hashIp(req.ip)
    const { code, expiresAt } = await issueCode({ userId, ipHash })

    try {
      await sendVerificationEmail({ to: trimmedEmail, code })
    } catch (mailErr) {
      console.error('[auth][signup] sendMail error', mailErr)
      return res.status(500).json({ error: 'Failed to send verification email' })
    }

    return res.json({ ok: true, expiresAt })
  } catch (err) {
    console.error('[auth][signup] unexpected error', err)
    return res.status(500).json({ error: 'Signup failed' })
  }
})

router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'email is required' })

    const trimmedEmail = String(email).trim().toLowerCase()
    const user = await findUserByEmail(trimmedEmail)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (userAlreadyConfirmed(user)) return res.status(400).json({ error: 'User already verified' })

    const { data: recentCodes } = await supabase
      .from('verification_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const lastCreatedAt = recentCodes?.[0]?.created_at ? new Date(recentCodes[0].created_at).getTime() : 0
    if (lastCreatedAt && Date.now() - lastCreatedAt < RESEND_COOLDOWN_SECONDS * 1000) {
      return res.status(429).json({ error: 'Please wait before requesting another code' })
    }

    await markExistingCodesConsumed(user.id)
    const ipHash = hashIp(req.ip)
    const { code, expiresAt } = await issueCode({ userId: user.id, ipHash })

    try {
      await sendVerificationEmail({ to: trimmedEmail, code })
    } catch (mailErr) {
      console.error('[auth][resend] sendMail error', mailErr)
      return res.status(500).json({ error: 'Failed to send verification email' })
    }

    return res.json({ ok: true, expiresAt })
  } catch (err) {
    console.error('[auth][resend] unexpected error', err)
    return res.status(500).json({ error: 'Resend failed' })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {}
    if (!email || !code) return res.status(400).json({ error: 'email and code are required' })

    const trimmedEmail = String(email).trim().toLowerCase()
    const user = await findUserByEmail(trimmedEmail)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (userAlreadyConfirmed(user)) return res.status(200).json({ ok: true, alreadyVerified: true })

    const codeHash = hashCode(String(code).trim())
    const nowIso = new Date().toISOString()

    const { data: codeRows, error: codeError } = await supabase
      .from('verification_codes')
      .select('id, expires_at, consumed_at')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .order('created_at', { ascending: false })
      .limit(1)

    if (codeError) {
      console.error('[auth][verify] fetch code error', codeError)
      return res.status(500).json({ error: 'Verification failed' })
    }

    const record = codeRows?.[0]
    if (!record) return res.status(400).json({ error: 'Invalid code' })
    if (record.consumed_at) return res.status(400).json({ error: 'Code already used' })
    if (new Date(record.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Code expired' })

    const { error: consumeError } = await supabase
      .from('verification_codes')
      .update({ consumed_at: nowIso })
      .eq('id', record.id)

    if (consumeError) {
      console.error('[auth][verify] consume error', consumeError)
      return res.status(500).json({ error: 'Verification failed' })
    }

    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true })
    if (confirmError) {
      console.error('[auth][verify] confirm error', confirmError)
      return res.status(500).json({ error: 'Failed to confirm user' })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[auth][verify] unexpected error', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
})

export default router
