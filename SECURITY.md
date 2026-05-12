# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in BLUE, **do not open a public issue.**

Email the details to **mohammedbfsvc@gmail.com** with the subject line `[SECURITY] <brief description>`.

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (be as specific as possible)
- Any proof-of-concept code or screenshots

You'll receive an acknowledgment within 48 hours. If the issue is confirmed, a fix will be prioritized and released as soon as possible. You'll be credited in the release notes unless you prefer otherwise.

## Scope

Vulnerabilities in the following are in scope:
- Client-side code (`src/`)
- Database schema and RLS policies (`schema.sql`)
- Authentication logic (Supabase Auth integration, local PGlite auth)

The following are out of scope:
- Vulnerabilities in third-party dependencies (report those upstream)
- Issues that require physical access to a user's device
- Self-XSS or attacks that require the victim to run code themselves

## Supported Versions

Only the latest version on the `main` branch is actively maintained.
