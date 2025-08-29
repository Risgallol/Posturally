Drop your built SlouchApp here 👇

How to link:
1) Build your existing app (e.g., Vite/React/Vanilla) so it produces an index.html and assets.
2) Copy the entire build output into this folder: public/slouch-app/
   (You should end up with public/slouch-app/index.html + js/css assets)
3) If your app uses relative assets, you’re good. If not, open index.html and set:
   <base href="/slouch-app/">
4) Deploy the landing project. Your app will be available at:
   https://YOUR-DOMAIN/app  → which iframes →  /slouch-app/index.html

Privacy note:
- The iframe allows camera access via the page’s normal permission flow.
- No video is uploaded unless your app explicitly does so.