# Gmail Assistant Setup (Knight)

## 1) Put OAuth client JSON here

Save your downloaded Google OAuth desktop credentials as:

`~/.openclaw/secrets/gmail-oauth-client.json`

## 2) Install dependencies

```bash
cd /home/knight/.openclaw/workspace/gmail-assistant
npm install
```

## 3) One-time auth

```bash
npm run auth
```

A browser window opens. Log into the dedicated Knight Gmail account and approve access.

Token is saved to:

`~/.openclaw/secrets/gmail-token.json`

## 4) Check unread inbox mail

```bash
npm run check
```

Optional custom query:

```bash
node check.js 20 "is:unread newer_than:2d"
```

## 5) Send mail

```bash
npm run send -- "recipient@example.com" "Subject" "Body"
```
