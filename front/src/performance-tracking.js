window.addEventListener('load', () => {
    const [entry] = performance.getEntriesByType("navigation");
    const loadTime = entry.loadEventEnd - entry.startTime;

    // Send to your server anonymously
    fetch('https://colaf.huma-num.fr/timing-tracking/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            duration: loadTime,
            uri: window.location.href
        })
    }).catch(err => {
        console.error('Failed to send load time:', err);
    });
});
