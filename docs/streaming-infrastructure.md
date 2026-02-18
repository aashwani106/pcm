# Streaming Infrastructure (Self-Hosted)

## LiveKit Server

- Runs on dedicated VPS
- Public IP required
- HTTPS enabled
- Domain required
- TURN support enabled

---

## Required Infrastructure

- 1 VPS (minimum 4 vCPU, 8GB RAM for small scale)
- Domain (e.g., live.yourdomain.com)
- SSL certificate (Let's Encrypt)
- Firewall open ports:
  - 443 (HTTPS)
  - 7880 (LiveKit default)
  - UDP range for WebRTC

---

## Deployment Method

LiveKit runs via:
- Docker
OR
- Native binary

---

## Future Scaling

If viewer count grows:
- Move to larger instance
- Add horizontal scaling
- Add TURN servers
