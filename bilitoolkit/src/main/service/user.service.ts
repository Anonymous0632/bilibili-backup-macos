import { type UserInfoWithCookie, BiliClient, type UserCookie } from '@ybgnb/bili-api'
import type { UserListSyncResult } from '@/shared/types/toolkit-core-api.js'
import { sleepRandom } from '@ybgnb/utils'
import { electronFetch, installElectronFetch } from '@/main/utils/electron-fetch.js'

export class UserService {
  async syncUserList(users: UserInfoWithCookie[]): Promise<UserListSyncResult> {
    const updatedList: UserInfoWithCookie[] = []
    const expiredList: UserInfoWithCookie[] = []
    installElectronFetch()
    const biliClient = new BiliClient({ fetcher: electronFetch })
    for (const user of users) {
      biliClient.updateRequestContext({
        userCookie: user.userCookie,
      })
      try {
        updatedList.push({
          ...(await biliClient.user.getMyInfo()),
          userCookie: user.userCookie,
        })
        await sleepRandom(500, 1000)
      } catch {
        expiredList.push(user)
      }
    }
    return { updatedList, expiredList }
  }

  async getMyInfoByCookie(userCookie: UserCookie): Promise<UserInfoWithCookie> {
    installElectronFetch()
    return {
      ...(await new BiliClient({
        fetcher: electronFetch,
        context: {
          userCookie: userCookie,
        },
      }).user.getMyInfo()),
      userCookie: userCookie,
    }
  }
}

export const userService = new UserService()
