const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/groups/public',
    method: 'GET',
    headers: {
        'Accept': 'application/json'
    },
    timeout: 5000
};

console.log(`Testing GET http://localhost:3001/groups/public...`);
const start = Date.now();

const req = http.request(options, (res) => {
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Request completed in ${Date.now() - start}ms`);
        console.log(`Data length: ${data.length} bytes`);
        try {
            const parsed = JSON.parse(data);
            console.log('Sample Data (first 2 items):', JSON.stringify(parsed.slice(0, 2), null, 2));
        } catch (e) {
            console.log('Data (raw):', data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.on('timeout', () => {
    console.error('Request timed out after 5s');
    req.destroy();
});

req.end();
