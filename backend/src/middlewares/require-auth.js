import { supabase } from '../config/supabase.js'

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing token' })
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' })
    }

    req.user = data.user
    next()
  } catch (err) {
    console.error('[auth][requireAuth] error', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export default requireAuth
