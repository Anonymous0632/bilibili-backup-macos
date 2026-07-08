<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserStore } from '@/renderer/stores/user.js'
import type { UserInfo } from '@ybgnb/bili-api'
import { createHostBiliClient } from '@/renderer/api/bili-client.js'
import { getErrorMessage } from '@ybgnb/utils'
import QRCode from 'qrcode'

const visible = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'loginSuccess', user: UserInfo): void
}>()

const qrCodeImg = ref('')
const loginResult = ref('')
let abortController = new AbortController()

const sleep = async (ms: number, signal: AbortSignal) => {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

const handleCancel = () => {
  abortController.abort('取消登录')
  emit('cancel')
  visible.value = false
}

const startLogin = async () => {
  const signal = abortController.signal
  const biliClient = await createHostBiliClient()
  const timeoutAt = Date.now() + 180 * 1000

  try {
    while (!signal.aborted && Date.now() < timeoutAt) {
      loginResult.value = '正在获取登录二维码...'
      const qrcode = await biliClient.user.getLoginQRCode({ signal })
      if (!qrcode?.url || !qrcode?.qrcode_key) throw new Error('未能获取有效的二维码数据')

      qrCodeImg.value = await QRCode.toDataURL(qrcode.url)
      loginResult.value = '请使用手机 App 扫码登录...'
      await sleep(2000, signal)

      let refreshQRCode = false
      while (!signal.aborted && !refreshQRCode && Date.now() < timeoutAt) {
        const result = await biliClient.user.getQRCodeLoginResult(qrcode.qrcode_key, { signal })
        loginResult.value = result.message

        if (result.code === 0) {
          loginResult.value = '扫码成功，正在同步用户信息...'
          const context = await biliClient.user.initLoginSession(result.setCookie, true, { signal })
          const userInfo = await biliClient.user.getMyInfo(undefined, { signal })
          const stat = await biliClient.relation.getStat(userInfo.mid, { signal })

          // 官方接口两个都是粉丝数...
          userInfo.follower = stat.follower
          userInfo.following = stat.following
          await useUserStore().loginUser({
            ...userInfo,
            userCookie: context.userCookie,
          })
          emit('loginSuccess', userInfo)
          visible.value = false
          return
        }

        if (result.code === 86038) {
          loginResult.value = '二维码已失效，正在自动刷新...'
          refreshQRCode = true
          continue
        }

        await sleep(1233, signal)
      }
    }

    if (signal.aborted) {
      loginResult.value = '取消登录'
      return
    }

    throw new Error('登录超时')
  } catch (error) {
    if (signal.aborted) {
      loginResult.value = '取消登录'
      return
    }
    loginResult.value = `登录失败：${getErrorMessage(error)}`
    throw error
  }
}

watch(visible, (newValue) => {
  if (newValue) {
    if (abortController.signal.aborted) {
      abortController = new AbortController()
    }
    startLogin()
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="登录账号"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="true"
    @close="handleCancel"
  >
    <div class="content-container">
      <div class="hint">请扫描二维码登录</div>

      <div class="qrcode-container">
        <div>获取二维码中，请稍候...</div>
        <img alt="" :src="qrCodeImg" />
      </div>
      <div class="login-result">{{ loginResult }}</div>
    </div>
    <template #footer></template>
  </el-dialog>
</template>

<style scoped lang="scss">
.content-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--el-text-color-regular);
  gap: 20px;
  user-select: none;

  .qrcode-container {
    width: 200px;
    height: 200px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    > img {
      position: absolute;
      width: 100%;
      height: 100%;
      left: 0;
      top: 0;
    }
  }
}
</style>
