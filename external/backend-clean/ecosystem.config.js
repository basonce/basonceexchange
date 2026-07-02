module.exports = {
  apps: [
    {
      name: 'trading-platform',
      script: 'src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3050,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
