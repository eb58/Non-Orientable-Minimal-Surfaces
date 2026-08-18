package de.eb58.minimalflaechen;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + APP_HOST + "/index.html?tv=1";
    private WebView webView;
    private boolean menuHeld;
    private boolean menuShortcutUsed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableImmersiveMode();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new LocalContentClient());

        final WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        setContentView(webView);
        webView.loadUrl(APP_URL);
        webView.requestFocus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enableImmersiveMode();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        menuHeld = false;
        menuShortcutUsed = false;
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        final int keyCode = event.getKeyCode();
        if (event.getAction() == KeyEvent.ACTION_UP && keyCode == KeyEvent.KEYCODE_MENU) {
            menuHeld = false;
            if (!menuShortcutUsed) sendTvKey("menu");
            menuShortcutUsed = false;
            return true;
        }
        if (event.getAction() != KeyEvent.ACTION_DOWN) return super.dispatchKeyEvent(event);

        switch (keyCode) {
            case KeyEvent.KEYCODE_MENU:
                if (event.getRepeatCount() == 0) {
                    menuHeld = true;
                    menuShortcutUsed = false;
                }
                return true;
            case KeyEvent.KEYCODE_DPAD_LEFT:
                if (menuHeld) return useMenuShortcut("materialPrevious");
                return useDirectionalKey("directionLeft");
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (menuHeld) return useMenuShortcut("materialNext");
                return useDirectionalKey("directionRight");
            case KeyEvent.KEYCODE_DPAD_UP:
                if (menuHeld) return useMenuShortcut("backgroundPrevious");
                return useDirectionalKey("directionUp");
            case KeyEvent.KEYCODE_DPAD_DOWN:
                if (menuHeld) return useMenuShortcut("backgroundNext");
                return useDirectionalKey("directionDown");
            case KeyEvent.KEYCODE_TAB:
                if (event.getRepeatCount() == 0) sendTvKey(event.isShiftPressed() ? "focusPrevious" : "focusNext");
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
                if (event.getRepeatCount() == 0) sendTvKey("select");
                return true;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (event.getRepeatCount() == 0) sendTvKey("playPause");
                return true;
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                sendTvKey("rewind");
                return true;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                sendTvKey("fastForward");
                return true;
            default:
                break;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript(
            "Boolean(window.fireTvHandleKey && window.fireTvHandleKey('back'))",
            handled -> {
                if (!"true".equals(handled)) MainActivity.super.onBackPressed();
            }
        );
    }

    private void sendTvKey(String key) {
        webView.evaluateJavascript("window.fireTvHandleKey && window.fireTvHandleKey('" + key + "')", null);
    }

    private boolean useMenuShortcut(String key) {
        menuShortcutUsed = true;
        sendTvKey(key);
        return true;
    }

    private boolean useDirectionalKey(String key) {
        sendTvKey(key);
        return true;
    }

    private void enableImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private final class LocalContentClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            final Uri uri = request.getUrl();
            if (!"https".equals(uri.getScheme()) || !APP_HOST.equals(uri.getHost())) {
                return new WebResourceResponse("text/plain", "UTF-8", null);
            }

            final String path = uri.getPath() == null || "/".equals(uri.getPath())
                ? "index.html"
                : uri.getPath().substring(1);
            try {
                final InputStream stream = getAssets().open("www/" + path);
                return new WebResourceResponse(
                    mimeTypeFor(path),
                    "UTF-8",
                    200,
                    "OK",
                    Collections.singletonMap("Access-Control-Allow-Origin", "*"),
                    stream
                );
            } catch (IOException ignored) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), null);
            }
        }

        private String mimeTypeFor(String path) {
            final String extension = MimeTypeMap.getFileExtensionFromUrl(path).toLowerCase(Locale.ROOT);
            if ("js".equals(extension) || "mjs".equals(extension)) return "application/javascript";
            if ("svg".equals(extension)) return "image/svg+xml";
            final String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            return mimeType == null ? "application/octet-stream" : mimeType;
        }
    }
}
