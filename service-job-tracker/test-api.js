const axios = require('axios');

async function test() {
    try {
        // Login
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.access_token;
        console.log("Logged in.");

        const taskRes = await axios.get('http://localhost:3001/api/tasks/37', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Task #37:", JSON.stringify(taskRes.data, null, 2));

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

test();
