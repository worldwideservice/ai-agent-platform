/**
 * PM2 Ecosystem Configuration
 *
 * Production deployment configuration for the AI Agent Platform backend
 *
 * Commands:
 * - Start: pm2 start ecosystem.config.js
 * - Start with 4 instances: pm2 start ecosystem.config.js --instances 4
 * - Stop: pm2 stop all
 * - Restart: pm2 restart all
 * - Logs: pm2 logs
 * - Monitor: pm2 monit
 * - Status: pm2 status
 */

module.exports = {
  apps: [
    {
      name: 'ai-agent-api',
      script: 'dist/index.js',
      instances: process.env.PM2_INSTANCES || 'max', // Use all CPU cores or specify number
      exec_mode: 'cluster', // Enable cluster mode for load balancing
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logging
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true, // Add timestamps to logs
      // Graceful shutdown
      kill_timeout: 5000, // Time to wait before SIGKILL
      wait_ready: true, // Wait for 'ready' signal
      listen_timeout: 10000, // Time to wait for app to listen
      // Health check
      max_restarts: 10,
      min_uptime: '5s',
      // Cron restart (optional - restart every day at 3am)
      // cron_restart: '0 3 * * *',
    },

    // Separate worker process (optional - for high load)
    // Uncomment to run workers as separate process
    /*
    {
      name: 'ai-agent-worker',
      script: 'dist/workers/webhook.worker.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      time: true,
    },
    */
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/ai-agent-platform.git',
      path: '/var/www/ai-agent-platform',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'cd backend && npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
