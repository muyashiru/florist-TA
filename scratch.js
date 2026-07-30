fetch('http://localhost:3000/api/test-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "ada rekomendasi buket harga 200rb an ga", sender: "0895339549364_SANDBOX" })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
