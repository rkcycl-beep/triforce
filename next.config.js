/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['dgalywyr863hv.cloudfront.net', 'lh3.googleusercontent.com'],
  },
};

module.exports = withPWA(nextConfig);
