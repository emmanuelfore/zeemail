module.exports = {
  apps: [
    {
      name: 'zeemail-api',
      cwd: '/var/www/zeemail',
      script: 'server/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
