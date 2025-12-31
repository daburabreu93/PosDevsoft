// Native fetch in Node 18+

async function test() {
    try {
        console.log('Testing AR History endpoint...');
        // Assume ID 1 exists
        const r1 = await fetch('http://localhost:3000/api/accounts/history/1');
        console.log('AR Status:', r1.status);
        console.log('AR Body:', await r1.text());

        console.log('Testing AP History endpoint...');
        // Assume ID 1 exists
        const r2 = await fetch('http://localhost:3000/api/accounts-payable/history/1');
        console.log('AP Status:', r2.status);
        console.log('AP Body:', await r2.text());

    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
