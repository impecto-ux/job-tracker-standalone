
module.exports = {
    apps: [{
        name: "art-engine-v4",
        script: "node_modules/next/dist/bin/next",
        args: "start -H 0.0.0.0",
        cwd: "/var/www/job-tracker/art-engine-v4",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
}
