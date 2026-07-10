package io.github.hzhilong.bilibili.backup.gui.worker;

import io.github.hzhilong.base.bean.BuCallback;
import io.github.hzhilong.base.error.BusinessException;
import io.github.hzhilong.baseapp.utils.JContextUtil;
import io.github.hzhilong.bilibili.backup.api.user.User;
import io.github.hzhilong.bilibili.backup.app.bean.BusinessResult;
import io.github.hzhilong.bilibili.backup.app.bean.SavedUser;
import io.github.hzhilong.bilibili.backup.app.business.BusinessType;
import io.github.hzhilong.bilibili.backup.app.service.BackupRestoreItem;
import io.github.hzhilong.bilibili.backup.app.service.BackupRestoreService;
import io.github.hzhilong.bilibili.backup.app.service.impl.FavoritesService;
import io.github.hzhilong.bilibili.backup.app.service.impl.FollowingService;
import io.github.hzhilong.bilibili.backup.app.state.setting.AppSettingItems;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;

import java.awt.Window;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * 将基准账号的数据直接同步到目标账号，不写入本地备份文件。
 */
@Slf4j
public class AccountSyncRunnable extends BaseRunnable {

    private final Window parent;
    private final String appIconPath;
    private final SavedUser sourceUser;
    private final SavedUser targetUser;
    private final LinkedHashSet<BackupRestoreItem> items;
    private final BuCallback<Void> buCallback;

    private BackupRestoreService<?> sourceService;
    private BackupRestoreService<?> targetService;

    public AccountSyncRunnable(Window parent, String appIconPath, OkHttpClient client,
                               SavedUser sourceUser, SavedUser targetUser,
                               LinkedHashSet<BackupRestoreItem> items, BuCallback<Void> buCallback) {
        super(client);
        this.parent = parent;
        this.appIconPath = appIconPath;
        this.sourceUser = sourceUser;
        this.targetUser = targetUser;
        this.items = items;
        this.buCallback = buCallback;
    }

    @Override
    public void setInterrupt(boolean interrupt) {
        this.interrupt = interrupt;
        if (sourceService != null) {
            sourceService.setInterrupt(interrupt);
        }
        if (targetService != null) {
            targetService.setInterrupt(interrupt);
        }
    }

    @Override
    public void run() {
        boolean onceSuccessful = false;
        List<BusinessResult<?>> syncResults = new ArrayList<>();
        log.info("开始同步账号：{} => {}", sourceUser, targetUser);
        for (BackupRestoreItem item : items) {
            Map<String, String> inMemoryData = new HashMap<>();
            try {
                handleInterrupt();
                sourceService = newService(item, sourceUser, inMemoryData, false);
                targetService = newService(item, targetUser, inMemoryData, true);

                log.info("正在从基准账号读取[{}]...", item.getName());
                List<? extends BusinessResult<?>> backupResults = sourceService.backup();
                logStageResults("读取", backupResults);
                if (inMemoryData.isEmpty()) {
                    throw new BusinessException("未读取到可同步的数据");
                }

                handleInterrupt();
                log.info("正在向目标账号同步[{}]...", item.getName());
                List<? extends BusinessResult<?>> restoreResults = targetService.restore();
                if (restoreResults != null) {
                    syncResults.addAll(restoreResults);
                    if (hasSuccess(restoreResults)) {
                        onceSuccessful = true;
                    }
                }
            } catch (Exception e) {
                String msg = String.format("同步[%s]失败：%s", item.getName(), e.getMessage());
                logFailure(e, msg);
                syncResults.add(buildFailureResult(item, msg));
            } finally {
                inMemoryData.clear();
                sourceService = null;
                targetService = null;
            }
            if (interrupt) {
                log.info("已中断同步任务");
                break;
            }
        }

        printSummary(syncResults);
        if (buCallback == null) {
            return;
        }
        if (interrupt) {
            buCallback.interrupt();
        } else if (onceSuccessful) {
            log.info("账号同步完成！");
            buCallback.success(null);
        } else {
            log.info("账号同步失败！");
            buCallback.fail("账号同步失败！");
        }
    }

    private BackupRestoreService<?> newService(BackupRestoreItem item, SavedUser savedUser,
                                                Map<String, String> inMemoryData, boolean target) {
        BackupRestoreService<?> service = item.getServiceBuilder().build(client,
                new User(savedUser.getCookie()), "");
        JContextUtil.init(parent, appIconPath, service);
        service.setInMemoryBackupData(inMemoryData);
        service.setInteractiveSelection(false);
        service.setDirectRestore(false);
        service.setAllowFailure(AppSettingItems.ALLOW_FAILURE.getValue());
        if (service instanceof FavoritesService) {
            ((FavoritesService) service).setSaveToDefaultOnFailure(
                    AppSettingItems.FAV_SAVE_TO_DEFAULT_ON_FAILURE.getValue());
        }
        if (target && service instanceof FollowingService) {
            ((FollowingService) service).setExactSyncFollowing(true);
        }
        return service;
    }

    private boolean hasSuccess(List<? extends BusinessResult<?>> results) {
        for (BusinessResult<?> result : results) {
            if (result != null && result.isSuccess()) {
                return true;
            }
        }
        return false;
    }

    private void logStageResults(String stage, List<? extends BusinessResult<?>> results) {
        if (results == null) {
            return;
        }
        for (BusinessResult<?> result : results) {
            if (result != null) {
                log.info("{}[{}]：{}", stage, result.getItemName(), result.getMsg());
            }
        }
    }

    private BusinessResult<?> buildFailureResult(BackupRestoreItem item, String msg) {
        BusinessResult<?> result = new BusinessResult<>();
        result.setBusinessType(BusinessType.SYNC);
        result.setItemName(item.getName());
        result.setFailed(msg);
        return result;
    }

    private void logFailure(Exception e, String msg) {
        if (e instanceof BusinessException) {
            log.info(msg);
        } else {
            log.error(msg, e);
        }
    }

    private void printSummary(List<BusinessResult<?>> results) {
        log.info("\n");
        log.info("┌──────────────────【同步结果】──────────────────");
        for (BusinessResult<?> result : results) {
            log.info("├── [{}]\t{}", result.getItemName(), result.getMsg());
        }
        log.info("└────────────────────────────────────────────");
    }
}
