/* Unity Ads Test Stub — browser preview only
   Simulates the UnityAds Web SDK so test ads display in the Replit preview.
   The real SDK (sdk.unityads.unity3d.com) is used in the native Android build. */

(function() {
    var _initialized = false;
    var _testMode    = true;
    var _gameId      = '';

    function _createOverlay(onClose) {
        var overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
            'background:rgba(0,0,0,0.94)', 'z-index:99999',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'font-family:Arial,sans-serif'
        ].join(';');

        var badge = document.createElement('div');
        badge.textContent = 'TEST AD';
        badge.style.cssText = [
            'position:absolute', 'top:12px', 'left:12px',
            'background:#e74c3c', 'color:#fff',
            'font-size:11px', 'font-weight:bold',
            'padding:4px 10px', 'border-radius:4px', 'letter-spacing:1px'
        ].join(';');

        var logo = document.createElement('div');
        logo.textContent = '🎮';
        logo.style.cssText = 'font-size:72px;margin-bottom:16px;';

        var title = document.createElement('div');
        title.textContent = 'Unity Ads';
        title.style.cssText = [
            'color:#fff', 'font-size:28px', 'font-weight:bold', 'margin-bottom:8px'
        ].join(';');

        var sub = document.createElement('div');
        sub.textContent = 'Test Ad · Game ID: ' + _gameId;
        sub.style.cssText = 'color:#aaa;font-size:13px;margin-bottom:32px;';

        var bar = document.createElement('div');
        bar.style.cssText = [
            'width:260px', 'height:6px', 'background:#333',
            'border-radius:3px', 'overflow:hidden', 'margin-bottom:28px'
        ].join(';');
        var fill = document.createElement('div');
        fill.style.cssText = [
            'height:100%', 'width:0%', 'background:#00c8ff',
            'border-radius:3px', 'transition:width 0.1s linear'
        ].join(';');
        bar.appendChild(fill);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = 'Skip Ad  ›';
        closeBtn.disabled = true;
        closeBtn.style.cssText = [
            'margin-top:8px', 'padding:12px 36px',
            'background:#00c8ff', 'color:#000',
            'border:none', 'border-radius:8px',
            'font-size:15px', 'font-weight:bold',
            'cursor:not-allowed', 'opacity:0.4',
            'transition:opacity 0.3s'
        ].join(';');

        var countdown = document.createElement('div');
        countdown.style.cssText = 'color:#666;font-size:12px;margin-top:10px;';

        overlay.appendChild(badge);
        overlay.appendChild(logo);
        overlay.appendChild(title);
        overlay.appendChild(sub);
        overlay.appendChild(bar);
        overlay.appendChild(closeBtn);
        overlay.appendChild(countdown);
        document.body.appendChild(overlay);

        var total   = 15000;
        var elapsed = 0;
        var step    = 100;
        var skipAt  = 5000;

        var timer = setInterval(function() {
            elapsed += step;
            var pct = Math.min(100, (elapsed / total) * 100);
            fill.style.width = pct + '%';

            var remain = Math.ceil((skipAt - elapsed) / 1000);
            if (elapsed < skipAt) {
                countdown.textContent = 'Skip in ' + remain + 's';
            } else {
                closeBtn.disabled = false;
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.opacity = '1';
                countdown.textContent = '';
                closeBtn.onclick = function() {
                    clearInterval(timer);
                    document.body.removeChild(overlay);
                    onClose('skipped');
                };
            }

            if (elapsed >= total) {
                clearInterval(timer);
                document.body.removeChild(overlay);
                onClose('completed');
            }
        }, step);
    }

    function _createBanner(container) {
        container.innerHTML = '';
        container.style.height          = '50px';
        container.style.background      = 'linear-gradient(90deg,#1a1a2e,#16213e)';
        container.style.borderTop       = '1px solid #00c8ff';
        container.style.display         = 'flex';
        container.style.alignItems      = 'center';
        container.style.justifyContent  = 'center';
        container.style.gap             = '12px';

        var label = document.createElement('span');
        label.textContent = '📢 Unity Test Banner Ad';
        label.style.cssText = 'color:#00c8ff;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;';

        var badge = document.createElement('span');
        badge.textContent = 'TEST';
        badge.style.cssText = [
            'background:#e74c3c', 'color:#fff',
            'font-size:10px', 'font-weight:bold',
            'padding:2px 7px', 'border-radius:3px',
            'font-family:Arial,sans-serif', 'letter-spacing:1px'
        ].join(';');

        container.appendChild(label);
        container.appendChild(badge);
    }

    window.UnityAds = {
        initialize: function(gameId, testMode, onSuccess, onFail) {
            _gameId      = gameId;
            _testMode    = testMode;
            _initialized = true;
            console.log('[UnityAds Stub] Initialized — gameId:', gameId, '| testMode:', testMode);
            setTimeout(function() {
                if (typeof onSuccess === 'function') onSuccess();
            }, 300);
        },

        isReady: function(placementId) {
            return _initialized;
        },

        show: function(placementId, callbacks) {
            if (!_initialized) {
                if (callbacks && callbacks.onError) callbacks.onError('Not initialized', placementId);
                return;
            }
            console.log('[UnityAds Stub] Showing test ad for placement:', placementId);
            if (callbacks && callbacks.onStart) callbacks.onStart(placementId);
            _createOverlay(function(result) {
                if (result === 'completed') {
                    if (callbacks && callbacks.onComplete) callbacks.onComplete(placementId);
                } else {
                    if (callbacks && callbacks.onSkip) callbacks.onSkip(placementId);
                }
            });
        },

        loadBanner: function(placementId, container, options, onSuccess, onFail) {
            if (!_initialized) {
                if (typeof onFail === 'function') onFail('Not initialized');
                return;
            }
            console.log('[UnityAds Stub] Loading test banner for placement:', placementId);
            setTimeout(function() {
                _createBanner(container);
                if (typeof onSuccess === 'function') onSuccess();
            }, 400);
        }
    };

    console.log('[UnityAds Stub] Loaded — waiting for unityAds.init()');
})();
