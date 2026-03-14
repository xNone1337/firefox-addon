async function init() {
    const slider = document.getElementById('volSlider');
    const display = document.getElementById('volValue');
    const resetBtn = document.getElementById('resetBtn');

    if (!slider || !display || !resetBtn) {
        console.error("Required HTML elements not found. Please check that IDs in HTML are correct.");
        return;
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.url) return;

    if (tab.url.startsWith("about:") || tab.url.startsWith("moz-extension:") || tab.url.startsWith("https://addons.mozilla.org")) {
        document.body.innerHTML = "<h4 style='padding:20px; text-align:center;'>This page is protected and cannot be controlled.</h4>";
        return;
    }

    const domain = new URL(tab.url).hostname;

    const savedData = await browser.storage.local.get(domain);
    const initialValue = savedData[domain] || 100;
    slider.value = initialValue;
    display.textContent = initialValue;

    try {
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["/scripts/content.js"]
        });
        sendVolume(tab.id, initialValue);
    } catch (err) {
        console.error("Failed to inject script:", err);
    }

    slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        display.textContent = val;

        const warningBox = document.getElementById('warningBox');
        if (val > 100) {
            display.style.color = "#ffcc00";
            warningBox.style.display = "block";
        } else {
            display.style.color = "#00ddff";
            warningBox.style.display = "none";
        }

        sendVolume(tab.id, val);
        browser.storage.local.set({ [domain]: val });
    });

    resetBtn.addEventListener('click', () => {
        const val = 100;
        slider.value = val;
        display.textContent = val;
        sendVolume(tab.id, val);
        browser.storage.local.set({ [domain]: val });
    });
}

function sendVolume(tabId, value) {
    browser.tabs.sendMessage(tabId, { type: "SET_VOLUME", value: value })
        .catch(e => console.warn("Message not delivered (normal behavior):", e));
}

init().catch(console.error);