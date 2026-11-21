import { handleNotify } from '../../server/notify.js'

export const handler = async (event) => {
  const result = await handleNotify({
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  })
  return {
    statusCode: result.statusCode,
    body: result.body,
  }
}
