const path = require('path');

module.exports = function override(config, env) {
  // Optimize for production
  if (env === 'production') {
    // Enable code splitting for node_modules
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        // Separate Ant Design into its own chunk
        antd: {
          test: /[\\/]node_modules[\\/]antd[\\/]/,
          name: 'vendor.antd',
          priority: 20,
          reuseExistingChunk: true,
        },
        // Separate icons into its own chunk
        icons: {
          test: /[\\/]node_modules[\\/]@ant-design[\\/]icons[\\/]/,
          name: 'vendor.icons',
          priority: 19,
          reuseExistingChunk: true,
        },
        // Separate React and DOM
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'vendor.react',
          priority: 18,
          reuseExistingChunk: true,
        },
        // Separate routing
        routing: {
          test: /[\\/]node_modules[\\/]react-router[\\/]/,
          name: 'vendor.routing',
          priority: 17,
          reuseExistingChunk: true,
        },
        // Separate other vendors
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor.misc',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    };
  }

  return config;
};
