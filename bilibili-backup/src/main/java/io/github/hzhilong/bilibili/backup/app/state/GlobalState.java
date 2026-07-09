package io.github.hzhilong.bilibili.backup.app.state;

import io.github.hzhilong.bilibili.backup.app.utils.HttpClientFactory;
import okhttp3.OkHttpClient;

import javax.swing.*;

/**
 * 全局状态
 *
 * @author hzhilong
 * @version 1.0
 */
public class GlobalState {

    public static OkHttpClient CLIENT = HttpClientFactory.createDefault();

    /**
     * 处理中（禁止退出/切换tab）
     */
    private static boolean processing = false;
    private static JTextArea processingLogger = null;

    public static synchronized boolean getProcessing(){
        return processing;
    }

    public static synchronized void setProcessing(boolean flag){
        processing = flag;
    }

    public static synchronized JTextArea getProcessingLogger(){
        return processingLogger;
    }

    public static synchronized void setProcessingLogger(JTextArea jTextArea){
        processingLogger = jTextArea;
    }

}
