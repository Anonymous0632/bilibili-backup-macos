package io.github.hzhilong.bilibili.backup.app.cli.business;

import io.github.hzhilong.bilibili.backup.app.utils.HttpClientFactory;
import okhttp3.OkHttpClient;
import io.github.hzhilong.bilibili.backup.api.bean.Upper;
import io.github.hzhilong.base.error.BusinessException;

import java.util.Scanner;

/**
 * 业务基类
 *
 * @author hzhilong
 * @version 1.0
 */
public abstract class BaseBusiness {

    protected OkHttpClient client;

    public BaseBusiness() {
        this.client = HttpClientFactory.createDefault();
    }

    /**
     * 处理业务
     *
     * @return 当前登录的UP信息
     * @throws BusinessException 业务异常
     */
    public abstract Upper process(Scanner scanner) throws BusinessException;

}
