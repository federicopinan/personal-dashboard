/** @type {import('next').NextConfig} */
const nextConfig = {
  // No rewrites. The MCP/OAuth connector was retired in the
  // Netlify/localStorage migration: a server cannot persist server writes into a
  // browser's localStorage, so the connector (which talked to the owner's
  // Supabase backend) is gone with the backend. The `.well-known/*` discovery
  // routes the old OAuth server used to advertise are no longer needed.
}

export default nextConfig