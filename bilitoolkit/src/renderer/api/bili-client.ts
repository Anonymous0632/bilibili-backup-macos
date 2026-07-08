import type { BiliClient } from '@ybgnb/bili-api'
import { getAppLogLevel } from '@/shared/common/app-log'
import { createBiliClient } from 'bilitoolkit-runtime/biliapi'
import { toolkitApi } from '@/renderer/api/toolkit-api.js'

export async function createHostBiliClient(): Promise<BiliClient> {
  const clientConfig = await toolkitApi.bili.createBiliClient({
    logLevel: getAppLogLevel(),
  })
  return createBiliClient(clientConfig.id)
}
