Quick setup

1. Install dependencies:

```bash
cd "c:\Users\dell\Desktop\Student detail"
npm install
```

2. Start server (binds to all interfaces so phone on same LAN can access):

```bash
npm start
```

3. Open in browser on laptop:

- http://localhost:3000

4. On phone (same Wi-Fi): find your laptop IP (e.g., 192.168.1.10) and open:

- http://<laptop-ip>:3000

5. Login credentials:

- Username: `admin`
- Password: `admin123`

The app now starts at the login page and redirects to `index.html` after successful login.

6. On other devices: use the same login credentials after opening the site.

- http://<laptop-ip>:3000

Notes:
- The server stores data in `db.json` in the folder.
- If you prefer public access without LAN, use a tunnel service (ngrok) and point your phone to the generated URL.
