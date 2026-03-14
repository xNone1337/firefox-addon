(function () {
    if (window.hasVolumeControlRun) {
        console.log("Volume Control content script has already run on this page.");
        return;
    }
    window.hasVolumeControlRun = true;

    let audioCtx = null;
    let gainNode = null;
    const connectedElements = new WeakSet();
    
    function initAudioEngine() {
        if (!audioCtx) {
            
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            gainNode = audioCtx.createGain();
            
            gainNode.connect(audioCtx.destination);
        }
    }

    function connectMediaElements() {
        const mediaElements = document.querySelectorAll('video, audio');
        
        mediaElements.forEach(media => {
            if (!connectedElements.has(media)) {
                try {
                    initAudioEngine();
                    
                    const source = audioCtx.createMediaElementSource(media);
                    
                    source.connect(gainNode);
                    
                    
                    connectedElements.add(media);
                } catch (e) {
                    console.warn("Unable to connect audio components:", e);
                }
            }
        });

        if (audioCtx && audioCtx.state === 'suspended') {
            const resumeAudio = () => {
                audioCtx.resume();
                window.removeEventListener('click', resumeAudio);
            };
            window.addEventListener('click', resumeAudio);
        }
    }

    browser.runtime.onMessage.addListener((message) => {
        if (message.type === "SET_VOLUME") {
            
            connectMediaElements();
            
            if (gainNode) {
                
                const volumeMultiplier = message.value / 100;
                
                
                gainNode.gain.setTargetAtTime(volumeMultiplier, audioCtx.currentTime, 0.01);
                
                console.log(`Volume adjusted to: ${message.value}%`);
            }
        }
    });

    const observer = new MutationObserver(() => {
        connectMediaElements();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    connectMediaElements();
})();