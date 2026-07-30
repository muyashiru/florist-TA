async function test() {
    const BITESHIP_TEST_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSmFsZUZsb3Jpc3QiLCJ1c2VySWQiOiI2YTY3YTJhODliN2QyZjc1MjJlZGE5ZDYiLCJpYXQiOjE3ODUyNjg2ODZ9.EvW8rEdn4IHORDT7PoSLCdEApuw7oTk-yb5zhpU_aZs';
    
    const payloadOrder = {
        origin_contact_name: "Jale Florist",
        origin_contact_phone: "081234567890",
        origin_address: "Jl. Cibogo Atas No. 99, Sukawarna, Sukajadi, Bandung",
        origin_coordinate: { latitude: -6.892, longitude: 107.575 },
        destination_contact_name: "Test Cust",
        destination_contact_phone: "081234567891",
        destination_address: "Jl. Setiabudi No.22, Bandung",
        destination_coordinate: { latitude: -6.866, longitude: 107.595 },
        couriers: "gojek",
        courier_company: "gojek",
        courier_type: "instant",
        delivery_type: "later",
        delivery_date: "2026-08-02",
        delivery_time: "09:00",
        items: [
            { name: "Buket", value: 150000, quantity: 1, weight: 1000 }
        ]
    };

    const response = await fetch('https://api.biteship.com/v1/orders', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${BITESHIP_TEST_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadOrder)
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

test();
