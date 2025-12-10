module.exports = {
  apps: [
    {
      name: 'blaxk-bot',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};