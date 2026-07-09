package io.github.hzhilong.bilibili.backup.gui.worker.tools;

import io.github.hzhilong.base.error.BusinessException;
import io.github.hzhilong.bilibili.backup.api.user.User;
import io.github.hzhilong.bilibili.backup.app.bean.SavedUser;
import io.github.hzhilong.bilibili.backup.app.service.impl.FollowingService;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;

import java.util.LinkedHashSet;

/**
 * 取关已注销账号的线程
 *
 * @author hzhilong
 * @version 1.0
 */
@Slf4j
public class UnfollowCancelledFollowingRunnable extends ToolRunnable<FollowingService, Void> {

    private FollowingService followingService;

    public UnfollowCancelledFollowingRunnable(OkHttpClient client, SavedUser user, ToolBuCallback<Void> buCallback) {
        super(client, user, buCallback);
    }

    @Override
    protected void newServices(LinkedHashSet<FollowingService> services) {
        followingService = new FollowingService(client, new User(user.getCookie()), "");
        services.add(followingService);
    }

    @Override
    protected Void runTool() throws BusinessException {
        followingService.unfollowCancelledFollowings();
        return null;
    }
}
