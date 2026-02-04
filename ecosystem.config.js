module.exports = {
  apps: [
    {
      name: 'xiaohongshu',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/www/xiaohongshu',
      instances: 1,  // 内存小的服务器建议单实例
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/xiaohongshu/error.log',
      out_file: '/var/log/xiaohongshu/out.log',
      merge_logs: true,
      // 内存限制（适合小内存服务器）
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      // 监控
      watch: false,
      // 优雅重启
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}
