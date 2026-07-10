package io.github.hzhilong.bilibili.backup.gui.page;

import io.github.hzhilong.base.bean.BuCallback;
import io.github.hzhilong.baseapp.component.OptItemSelector;
import io.github.hzhilong.baseapp.utils.LayoutUtil;
import io.github.hzhilong.bilibili.backup.app.bean.SavedUser;
import io.github.hzhilong.bilibili.backup.app.service.BackupRestoreItem;
import io.github.hzhilong.bilibili.backup.app.state.GlobalState;
import io.github.hzhilong.bilibili.backup.gui.component.UserSelector;
import io.github.hzhilong.bilibili.backup.gui.worker.AccountSyncRunnable;
import io.github.hzhilong.bilibili.backup.gui.worker.DelaySetProcessingLoggerRunnable;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;

import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.Window;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 基准账号到目标账号的直接同步页面。
 */
@Slf4j
public class SyncAccountPage extends PagePanel {

    private static final String ACTIVE_BTN_NAME = "开始同步";
    private static final String INACTIVE_BTN_NAME = "取消同步";

    private UserSelector sourceUserSelector;
    private UserSelector targetUserSelector;
    private OptItemSelector<BackupRestoreItem> itemSelector;
    private JButton btnSync;
    private JTextArea txtLog;
    private AccountSyncRunnable syncRunnable;

    public SyncAccountPage(Window parent, String appIconPath, OkHttpClient client) {
        super(parent, appIconPath, client);
    }

    @Override
    public void initUI() {
        int fixedY = 0;
        sourceUserSelector = new UserSelector(parentWindow, appIconPath, client, "基准账号：");
        addFixedContent(sourceUserSelector, 0, fixedY++);
        targetUserSelector = new UserSelector(parentWindow, appIconPath, client, "目标账号：");
        addFixedContent(targetUserSelector, 0, fixedY++);
        addSeparatorToFixed(0, fixedY);

        int dynamicY = 0;
        List<BackupRestoreItem> syncableItems = Arrays.stream(BackupRestoreItem.values())
                .filter(item -> item != BackupRestoreItem.FOLLOWER)
                .collect(Collectors.toList());
        itemSelector = new OptItemSelector<>(parentWindow, appIconPath, syncableItems, 3);
        addDynamicContent(itemSelector, 0, dynamicY++);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        GridBagConstraints constraints = LayoutUtil.getSeparatorConstraints(0, dynamicY++, 1, 1);
        addDynamicContent(btnPanel, constraints);
        btnSync = new JButton(ACTIVE_BTN_NAME);
        btnPanel.add(btnSync);
        btnPanel.add(new JLabel("关注列表将以基准账号为准"));

        JScrollPane scrollPaneLog = addTxtLogToDynamic(0, dynamicY);
        txtLog = (JTextArea) scrollPaneLog.getViewport().getView();

        setDynamicContentVisible(false);
        initListener();
    }

    private void initListener() {
        sourceUserSelector.addActionListener(e -> updateContentVisibility());
        targetUserSelector.addActionListener(e -> updateContentVisibility());
        btnSync.addActionListener(e -> {
            try {
                onSyncButton();
            } catch (Exception ex) {
                log.error(ex.getMessage(), ex);
            }
        });
    }

    private void updateContentVisibility() {
        setDynamicContentVisible(sourceUserSelector.getCurrUser() != null
                && targetUserSelector.getCurrUser() != null);
    }

    private void onSyncButton() {
        if (!ACTIVE_BTN_NAME.equals(btnSync.getText())) {
            int result = JOptionPane.showConfirmDialog(parentWindow,
                    "正在同步账号，是否取消？", "提示", JOptionPane.YES_NO_OPTION);
            if (result == JOptionPane.YES_OPTION && syncRunnable != null) {
                log.info("中断同步任务中...");
                syncRunnable.setInterrupt(true);
            }
            return;
        }
        if (GlobalState.getProcessing()) {
            JOptionPane.showMessageDialog(parentWindow, "有其他任务在运行！", "提示", JOptionPane.WARNING_MESSAGE);
            return;
        }

        SavedUser sourceUser = sourceUserSelector.getCurrUser();
        SavedUser targetUser = targetUserSelector.getCurrUser();
        if (sourceUser == null || targetUser == null) {
            JOptionPane.showMessageDialog(parentWindow, "请选择基准账号和目标账号！", "提示", JOptionPane.ERROR_MESSAGE);
            return;
        }
        if (Objects.equals(sourceUser.getMid(), targetUser.getMid())) {
            JOptionPane.showMessageDialog(parentWindow, "基准账号和目标账号不能相同！", "提示", JOptionPane.ERROR_MESSAGE);
            return;
        }
        LinkedHashSet<BackupRestoreItem> items = itemSelector.getSelectedItems();
        if (items.isEmpty()) {
            JOptionPane.showMessageDialog(parentWindow, "请至少选择一项！", "提示", JOptionPane.ERROR_MESSAGE);
            return;
        }

        String warning = String.format("是否将账号[%s]的数据直接同步到[%s]？", sourceUser, targetUser);
        if (items.contains(BackupRestoreItem.FOLLOWING)) {
            warning += "\n目标账号中基准账号未关注的用户将被取关。";
        }
        int result = JOptionPane.showConfirmDialog(parentWindow, warning, "确认同步", JOptionPane.YES_NO_OPTION);
        if (result == JOptionPane.YES_OPTION) {
            startSync(sourceUser, targetUser, items);
        }
    }

    private void startSync(SavedUser sourceUser, SavedUser targetUser,
                           LinkedHashSet<BackupRestoreItem> items) {
        setBusyStatus(true);
        syncRunnable = new AccountSyncRunnable(parentWindow, appIconPath, client,
                sourceUser, targetUser, items, new BuCallback<Void>() {
            @Override
            public void success(Void data) {
                setBusyStatus(false);
            }

            @Override
            public void fail(String msg) {
                setBusyStatus(false);
            }

            @Override
            public void interrupt() {
                setBusyStatus(false);
            }
        });
        new Thread(syncRunnable, "account-sync").start();
    }

    private void setBusyStatus(boolean busy) {
        btnSync.setText(busy ? INACTIVE_BTN_NAME : ACTIVE_BTN_NAME);
        sourceUserSelector.setEnabled(!busy);
        targetUserSelector.setEnabled(!busy);
        itemSelector.setEnabled(!busy);
        if (busy) {
            GlobalState.setProcessingLogger(txtLog);
        } else {
            new Thread(new DelaySetProcessingLoggerRunnable(null)).start();
        }
        GlobalState.setProcessing(busy);
    }
}
