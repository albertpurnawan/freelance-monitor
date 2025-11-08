// Minimal HS256 JWT signer for dev-only usage in the browser
// Do not use this in production; secrets must not be exposed client-side.

function toUint8Array(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

function base64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof data === 'string') {
    bytes = toUint8Array(data)
  } else if (data instanceof Uint8Array) {
    bytes = data
  } else {
    bytes = new Uint8Array(data)
  }
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function signHS256(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encHeader = base64urlEncode(JSON.stringify(header))
  const encPayload = base64urlEncode(JSON.stringify(payload))
  const data = `${encHeader}.${encPayload}`

  const keyData = toUint8Array(secret).buffer as ArrayBuffer
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  )
  const dataBuffer = toUint8Array(data).buffer as ArrayBuffer
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
  const encSig = base64urlEncode(sig)
  return `${data}.${encSig}`
}
