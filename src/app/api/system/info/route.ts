import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';
import os from 'os';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    // OS Version
    let osVersion = 'unknown';
    try {
      osVersion = execSync('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'', { encoding: 'utf8', timeout: 10000 }).trim();
    } catch (e) { console.error('Error getting OS version:', e); }

    // Kernel
    let kernel = 'unknown';
    try {
      kernel = execSync('uname -r', { encoding: 'utf8', timeout: 10000 }).trim();
    } catch (e) { console.error('Error getting kernel:', e); }

    // Kernel full info
    let kernelFull = 'unknown';
    try {
      kernelFull = execSync('uname -a', { encoding: 'utf8', timeout: 10000 }).trim();
    } catch (e) { console.error('Error getting kernel full:', e); }

    // IP addresses
    let ipAddresses: string[] = [];
    try {
      const ipOutput = execSync("hostname -I 2>/dev/null", { encoding: 'utf8', timeout: 10000 }).trim();
      ipAddresses = ipOutput.split(/\s+/).filter(Boolean);
    } catch (e) { console.error('Error getting IPs:', e); }

    // Public IP
    let publicIP = 'unknown';
    try {
      publicIP = execSync('curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
    } catch (e) { console.error('Error getting public IP:', e); }

    // Hostname
    const hostname = os.hostname();

    // Cloudflare tunnel status
    let cfTunnelStatus = 'unknown';
    let cfTunnelInfo: any = null;
    try {
      cfTunnelStatus = execSync('systemctl is-active cloudflared-tunnel 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
      const tunnelUrl = execSync('sudo cloudflared-tunnel info 2>/dev/null || echo "not available"', { encoding: 'utf8', timeout: 10000 }).trim();
      cfTunnelInfo = { status: cfTunnelStatus, info: tunnelUrl };
    } catch (e: any) {
      cfTunnelInfo = { status: cfTunnelStatus, info: e.message };
    }

    // UFW rules summary
    let ufwStatus = 'unknown';
    let ufwRules: Array<{ rule: string; detail: string }> = [];
    try {
      ufwStatus = execSync('sudo ufw status | head -1', { encoding: 'utf8', timeout: 10000 }).trim();
      const ufwOutput = execSync('sudo ufw status numbered 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 10000 }).trim();
      ufwRules = ufwOutput
        .split('\n')
        .filter(l => /^\[/.test(l.trim()))
        .map(l => {
          const match = l.match(/^\[([\d]+)\]\s+(.+)$/);
          return match ? { rule: match[1], detail: match[2].trim() } : null;
        })
        .filter(Boolean) as Array<{ rule: string; detail: string }>;
    } catch (e) { console.error('Error getting UFW rules:', e); }

    // SSH info
    let sshInfo: any = {};
    try {
      sshInfo.running = execSync('systemctl is-active sshd 2>/dev/null || systemctl is-active ssh 2>/dev/null || echo "unknown"', { encoding: 'utf8', timeout: 10000 }).trim();
      sshInfo.port = execSync("ss -tlnp 2>/dev/null | grep sshd | awk '{print $4}' | rev | cut -d: -f1 | rev | head -1 || echo '22'", { encoding: 'utf8', timeout: 10000 }).trim();
      sshInfo.configPath = '/etc/ssh/sshd_config';
      try {
        sshInfo.permitRootLogin = execSync("grep -i '^PermitRootLogin' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo 'not set'", { encoding: 'utf8', timeout: 10000 }).trim();
        sshInfo.passwordAuth = execSync("grep -i '^PasswordAuthentication' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo 'not set'", { encoding: 'utf8', timeout: 10000 }).trim();
      } catch {}
    } catch (e) { console.error('Error getting SSH info:', e); }

    // Open ports
    let openPorts: Array<{ port: string; state: string; service: string; process: string }> = [];
    try {
      const ssOutput = execSync('ss -tlnp 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
      openPorts = ssOutput
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map(line => {
          const parts = line.trim().split(/\s+/);
          const local = parts[3] || '';
          const port = local.split(':').pop() || '';
          const state = parts[1] || '';
          // Extract process name from the last column
          const processCol = parts.slice(5).join(' ') || '';
          let processName = '';
          const nameMatch = processCol.match(/users:\(\("([^"]+)"/);
          if (nameMatch) processName = nameMatch[1];
          return { port, state, service: port, process: processName };
        });
    } catch (e) { console.error('Error getting open ports:', e); }

    // Uptime
    const uptimeRaw = execSync('cat /proc/uptime', { encoding: 'utf8', timeout: 10000 }).trim().split(' ')[0];
    const uptimeSeconds = parseFloat(uptimeRaw);
    const uptimeDays = Math.floor(uptimeSeconds / 86400);
    const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);

    // CPU info
    const cpuModel = os.cpus()[0]?.model || 'unknown';
    const cpuCores = os.cpus().length;

    // Hermes version
    let hermesVersion = 'unknown';
    try {
      const hermesBin = process.env.HOME + '/.local/bin/hermes';
      hermesVersion = execSync(`${hermesBin} --version 2>/dev/null | head -1`, { encoding: 'utf8', timeout: 10000 }).trim();
    } catch {}

    // Node.js version
    let nodeVersion = 'unknown';
    try {
      nodeVersion = execSync('node --version 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
    } catch {}

    return NextResponse.json({
      os: {
        version: osVersion,
        kernel,
        kernelFull,
        hostname,
        architecture: os.arch(),
        platform: os.platform(),
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores,
      },
      network: {
        localIPs: ipAddresses,
        publicIP,
      },
      cloudflareTunnel: cfTunnelInfo,
      firewall: {
        status: ufwStatus,
        rules: ufwRules,
      },
      ssh: sshInfo,
      openPorts,
      uptime: { days: uptimeDays, hours: uptimeHours, rawSeconds: Math.floor(uptimeSeconds) },
      versions: {
        hermes: hermesVersion,
        node: nodeVersion,
      },
    });
  } catch (error: any) {
    console.error('Error fetching system info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
