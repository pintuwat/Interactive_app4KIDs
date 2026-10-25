# Deploying Ollie's Phonics (Phase 1: static site) on Coolify + Oracle Cloud

The site is plain HTML/CSS/JS served by nginx in Docker. No database, no API.
HTTPS is **required**: browsers only allow the PWA / offline mode on https (or localhost).

## 0. Before you start
- A running Coolify server on an Oracle Cloud instance (Ampere ARM or AMD — both work; `nginx:alpine` and `node:alpine` are multi-arch).
- A domain name, for example `phonics.example.com`, with an **A record** pointing at the instance's public IP.
- The project in a Git repository Coolify can read (GitHub / GitLab / Gitea, or a public URL).

Test locally first:
```bash
python3 -m http.server 8080      # then open http://localhost:8080
```
(Optional) build and run the real container on a machine that has Docker:
```bash
docker build -t ollie-phonics .
docker run --rm -p 8080:80 ollie-phonics
```

## 1. Push the code
```bash
git remote add origin <your-repo-url>
git push -u origin main
```
Do **not** commit secrets. Phase 1 has none.

## 2. Create the application in Coolify
1. **Projects → (your project) → + New → Application**.
2. Choose your Git source and repository, branch `main`.
3. **Build Pack: Dockerfile** (the `Dockerfile` is in the repository root).
4. **Ports Exposes: `80`**.
5. Leave "Base Directory" as `/`.
6. (Phase 2 only) add an environment variable `API_URL=https://api.example.com` so the site knows where the API is. Leave it empty in Phase 1.

## 3. Domain and HTTPS
1. In the application's **General** tab set **Domains** to `https://phonics.example.com`.
2. Coolify's proxy (Traefik/Caddy) requests a free Let's Encrypt certificate automatically once the DNS A record resolves. Make sure **ports 80 and 443 are reachable** (next section) or certificate issuing fails.
3. Click **Deploy**. Watch the build log: the build stage runs `node tools/build-site.mjs`, which copies only the website files and stamps a new cache version.

## 4. Open ports 80 and 443 on Oracle Cloud (two places!)
Oracle blocks traffic in **both** the cloud network and the instance firewall.

**a) Security list / network security group (Oracle console)**
- Networking → Virtual Cloud Networks → your VCN → Subnet → **Security List** → *Add Ingress Rules*
  - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port `80`
  - Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port `443`
- If your instance uses a Network Security Group, add the same two rules there.

**b) Instance firewall (SSH into the server)**
Ubuntu images use iptables rules that reject everything except SSH:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save        # keep the rules after reboot
```
Oracle Linux (firewalld) instead:
```bash
sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload
```
Check from your own computer: `curl -I https://phonics.example.com` should answer `200`.

## 5. Updating
Push to Git and press **Deploy** again (or enable Coolify's auto-deploy webhook). Every build changes the cache version, so tablets pick up the new version the next time they open the app online (close and reopen the app once).

## 6. Adding your recorded audio (Phase 3)
Record with `https://phonics.example.com/record-audio.html` (WAV files), unzip the download into `audio/` (the zip contains `us/` or `gb/`), run `node tools/build-audio-manifest.mjs`, commit and deploy. Missing files fall back to the tablet's built-in voice.

## 7. Troubleshooting
| Problem | Fix |
|---|---|
| "Add to Home Screen" missing | Must be https; open once online, wait 10 s |
| Old version after deploy | Close the app fully and reopen online; or clear site data |
| Certificate not issued | DNS A record wrong, or ports 80/443 closed in the Oracle security list or instance firewall |
| No British voice | The tablet has none installed; record audio (Phase 3) |
| 502 Bad Gateway | Check "Ports Exposes" is `80` and the container is healthy |

Run through [TABLET-TEST.md](TABLET-TEST.md) on a real iPad and Android tablet after the first deploy.
