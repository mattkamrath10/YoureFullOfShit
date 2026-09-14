# Render cutover checklist

Use this checklist to move production from Vercel to a Render Web Service without changing application behavior.

1. Create a Render Blueprint from this repository and apply `render.yaml`.
2. Copy every environment variable value from Vercel to the Render service. Use `.env.example` as the name checklist; do not copy or commit secrets into the repository.
3. Set `NEXT_PUBLIC_SITE_URL` to the final canonical HTTPS origin (custom domain if used, otherwise the Render service URL).
4. In Supabase Authentication URL Configuration, set Site URL to that canonical origin and add the production origin plus required auth redirect paths to Redirect URLs.
5. In Cloudflare R2 bucket CORS, add the new Render/custom-domain origin to `AllowedOrigins`. Keep localhost origins used for development.
6. Deploy the Render service and wait for a successful build.
7. Smoke test the production origin:
   - Sign up, sign in, sign out, and password reset.
   - Submit a story, including a large-video R2 multipart upload if enabled.
   - Confirm R2 playback, OpenAI TTS (or browser fallback), and admin new-story email notifications.
   - Check `/robots.txt`, `/sitemap.xml`, and generated review links.
8. After DNS, Supabase redirects, and R2 CORS all point to the new origin and smoke tests pass, disable the old Vercel production deployment.

Keep the Vercel deployment available until the Render production service is verified. The old `your-full-of-shit.vercel.app` typo continues to normalize to `youre-full-of-shit.vercel.app` for legacy links only.
