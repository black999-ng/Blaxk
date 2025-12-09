module.exports = {
  apps: [
    {
      name: 'blaxk-bot',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        SESSION_NAME: 'Blaxk_test',
        AUTH_METHOD: 'pair',
        FORCE_NON_INTERACTIVE: 'true'
      },
      
      // Auto-restart settings
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      
      // Logging
      out_file: './logs/out.log',
      err_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Shutdown grace period
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Watch mode (optional - restart on file changes)
      watch: false,
      ignore_watch: ['node_modules', 'sessions', 'database', 'logs', 'downloads', '.env'],
      
      // Cron-based restart (daily at 2 AM UTC)
      cron_restart: '0 2 * * *',
      
      // Memory limits
      max_memory_restart: '500M'
    }
  ],

  // Deploy configuration
  deploy: {
    production: {
      user: 'node',
      host: 'app.onrender.com',
      ref: 'origin/main',
      repo: 'https://github.com/black999-ng/Blaxk.git',
      path: '/var/www/blaxk-bot',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};