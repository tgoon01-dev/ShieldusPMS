import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { messages, system, max_tokens, model } = req.body
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const params = {
      model: model || 'claude-sonnet-4-6',
      max_tokens: max_tokens || 2000,
      messages,
    }
    if (system) params.system = system
    const response = await client.messages.create(params)
    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
