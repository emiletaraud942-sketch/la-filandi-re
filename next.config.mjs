/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/', destination: '/login.html', permanent: false },
    ];
  },
};

export default nextConfig;
