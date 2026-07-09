package io.github.hzhilong.bilibili.backup.app.utils;

import io.github.hzhilong.bilibili.backup.api.request.ThrottlingInterceptor;
import okhttp3.OkHttpClient;

import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509ExtendedTrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.Socket;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Locale;

/**
 * Shared OkHttp client setup.
 */
public final class HttpClientFactory {

    private HttpClientFactory() {
    }

    public static OkHttpClient createDefault() {
        OkHttpClient.Builder builder = new OkHttpClient.Builder()
                .addInterceptor(new ThrottlingInterceptor(1000));
        configureBilibiliTlsFallback(builder);
        return builder.build();
    }

    private static void configureBilibiliTlsFallback(OkHttpClient.Builder builder) {
        try {
            BilibiliFallbackTrustManager trustManager = new BilibiliFallbackTrustManager(defaultTrustManager());
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{trustManager}, null);
            builder.sslSocketFactory(sslContext.getSocketFactory(), trustManager);
        } catch (Exception ignored) {
            // Keep OkHttp's platform defaults if custom TLS setup is not available.
        }
    }

    private static X509TrustManager defaultTrustManager() throws Exception {
        TrustManagerFactory factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        factory.init((KeyStore) null);
        TrustManager[] trustManagers = factory.getTrustManagers();
        for (TrustManager trustManager : trustManagers) {
            if (trustManager instanceof X509TrustManager) {
                return (X509TrustManager) trustManager;
            }
        }
        throw new IllegalStateException("No X509TrustManager found");
    }

    private static final class BilibiliFallbackTrustManager extends X509ExtendedTrustManager {

        private final X509TrustManager delegate;
        private final X509ExtendedTrustManager extendedDelegate;

        private BilibiliFallbackTrustManager(X509TrustManager delegate) {
            this.delegate = delegate;
            this.extendedDelegate = delegate instanceof X509ExtendedTrustManager
                    ? (X509ExtendedTrustManager) delegate
                    : null;
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            delegate.checkClientTrusted(chain, authType);
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            delegate.checkServerTrusted(chain, authType);
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return delegate.getAcceptedIssuers();
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            if (extendedDelegate != null) {
                extendedDelegate.checkClientTrusted(chain, authType, socket);
            } else {
                delegate.checkClientTrusted(chain, authType);
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
            try {
                if (extendedDelegate != null) {
                    extendedDelegate.checkServerTrusted(chain, authType, socket);
                } else {
                    delegate.checkServerTrusted(chain, authType);
                }
            } catch (CertificateException ex) {
                if (isAllowedBilibiliHost(peerHost(socket))) {
                    return;
                }
                throw ex;
            }
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            if (extendedDelegate != null) {
                extendedDelegate.checkClientTrusted(chain, authType, engine);
            } else {
                delegate.checkClientTrusted(chain, authType);
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
            try {
                if (extendedDelegate != null) {
                    extendedDelegate.checkServerTrusted(chain, authType, engine);
                } else {
                    delegate.checkServerTrusted(chain, authType);
                }
            } catch (CertificateException ex) {
                if (isAllowedBilibiliHost(peerHost(engine))) {
                    return;
                }
                throw ex;
            }
        }

        private static String peerHost(Socket socket) {
            if (!(socket instanceof SSLSocket)) {
                return null;
            }
            SSLSession session = ((SSLSocket) socket).getHandshakeSession();
            if (session == null) {
                session = ((SSLSocket) socket).getSession();
            }
            return session == null ? null : session.getPeerHost();
        }

        private static String peerHost(SSLEngine engine) {
            SSLSession session = engine.getHandshakeSession();
            if (session == null) {
                session = engine.getSession();
            }
            return session == null ? null : session.getPeerHost();
        }

        private static boolean isAllowedBilibiliHost(String host) {
            if (host == null) {
                return false;
            }
            String normalized = host.toLowerCase(Locale.ROOT);
            return normalized.equals("bilibili.com")
                    || normalized.endsWith(".bilibili.com")
                    || normalized.equals("hdslb.com")
                    || normalized.endsWith(".hdslb.com");
        }
    }
}
