async function test() {
    try {
        const response = await fetch('https://1d38d524633187.lhr.life/api/webhook/biteship', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const text = await response.text();
        console.log("STATUS:", response.status);
        console.log("TEXT:", text);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
