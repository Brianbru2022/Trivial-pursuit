/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/themes/victorian/board-bg.jpg',
        headers: [
          { key: 'Content-Type', value: 'image/webp' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/themes/victorian/board-art.webp',
        headers: [
          { key: 'Content-Type', value: 'image/webp' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
