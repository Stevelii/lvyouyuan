module.exports = {
  apps: [
    {
      name: 'lvyouyuan-api',
      cwd: `${__dirname}/server`,
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 8507
      }
    }
  ]
}
