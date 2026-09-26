# Supabase Email Templates Configuration

## Problem Diagnosed
When requesting a password reset, Supabase Auth sends an email using its GoTrue mailer template.
In the Supabase project configuration, the template was mistakenly written as:
```html
<a href="Your verification code is:{{ .Token }}">Reset password</a>
```
Because `{{ .Token }}` was placed inside the `href` attribute of an `<a>` tag, GoTrue rendered:
```html
<a href="Your verification code is:64259352">Reset password</a>
```
This caused two major issues:
1. The 6-digit OTP code `64259352` was hidden inside the link's URL attribute instead of displayed as visible text on the page.
2. Clicking the "Reset password" button led to an invalid URL (`Your verification code is:...`), while the app's reset flow expects the user to copy/type the 6-digit code into the on-screen form.

---

## The Solution

### Step 1: Open your Supabase Dashboard
Go to:
👉 **[https://supabase.com/dashboard/project/otdvuuxmnlfjvtjifudq/auth/templates](https://supabase.com/dashboard/project/otdvuuxmnlfjvtjifudq/auth/templates)**

### Step 2: Select "Reset Password" (Recovery) Template
1. In the **Email Templates** list, click on **Reset Password** (or **Recovery**).
2. Set the **Subject** to:
   ```
   Your Jazelle Skin Haven Verification Code: {{ .Token }}
   ```
   *(or `Your Jazelle Skin Haven Verification Code`)*

### Step 3: Replace the Body Template
You can choose either the **Minimal** or the **Full Branded** template:

#### Option A: Minimal Clean Template (Recommended for simplicity)
```html
<h2>Reset your Jazelle Skin Haven password</h2>

<p>You requested to reset your password. Use the verification code below to set a new password:</p>

<p style="font-size: 16px;">
  Your verification code is: <strong style="font-size: 24px; color: #F13184; letter-spacing: 2px;">{{ .Token }}</strong>
</p>

<p>Enter this 6-digit code on the reset page. This code expires in 15 minutes.</p>

<p style="font-size: 12px; color: #888888;">
  If you did not request a password reset, you can safely ignore this email — your account remains secure.
</p>
```

#### Option B: Branded Jazelle Skin Haven Template
Copy the contents of `supabase/email-templates/reset-password.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #FCF3F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #760536; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(241, 49, 132, 0.08); border: 1px solid #F8DDE9; }
    .header { background: linear-gradient(135deg, #FCF3F7 0%, #F8DDE9 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #F5BCD5; }
    .logo-text { font-size: 24px; font-weight: 700; color: #A20B4C; margin: 0; }
    .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #F13184; margin-top: 4px; font-weight: 600; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; background: #F8DDE9; color: #A20B4C; }
    .title { font-size: 22px; font-weight: 700; color: #760536; margin: 12px 0 8px 0; }
    .lead { font-size: 15px; line-height: 1.6; color: #A20B4C; margin: 0 0 20px 0; }
    .code-box { background: #FCF3F7; border-radius: 16px; padding: 24px 20px; border: 1px solid #F8DDE9; text-align: center; margin: 24px 0; }
    .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #F13184; font-weight: 600; margin-bottom: 10px; }
    .code-number { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #760536; font-family: monospace; background: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 12px; border: 2px dashed #F25A9B; }
    .plain-text-code { font-size: 15px; color: #760536; margin-top: 14px; font-weight: 500; }
    .expiry { font-size: 12px; color: #A20B4C; margin-top: 12px; }
    .footer { background: #FCF3F7; padding: 20px; text-align: center; font-size: 12px; color: #A20B4C; border-top: 1px solid #F8DDE9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">Jazelle Skin Haven</h1>
      <div class="tagline">Your Self-Care Corner</div>
    </div>
    <div class="content">
      <span class="badge">Password Reset</span>
      <h2 class="title">Reset Your Password</h2>
      <p class="lead">
        We received a request to reset the password for your Jazelle Skin Haven account. Enter the verification code below on the screen to choose a new password.
      </p>

      <div class="code-box">
        <div class="code-label">Your Verification Code</div>
        <div class="code-number">{{ .Token }}</div>
        <p class="plain-text-code">
          Your verification code is: <strong style="color: #F13184; font-size: 18px;">{{ .Token }}</strong>
        </p>
        <div class="expiry">
          This code expires in 15 minutes. Enter this code directly in your browser.
        </div>
      </div>

      <p style="font-size: 13px; color: #A20B4C; line-height: 1.5; margin-top: 20px;">
        If you did not request a password reset, you can safely ignore this email — your account and password remain unchanged and completely secure.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Jazelle Skin Haven • Delivered with love across Nigeria</p>
    </div>
  </div>
</body>
</html>
```

### Step 4: Click Save
Click **Save** in the Supabase dashboard. Now, any password reset request will clearly show the OTP code as visible text, with no broken link or button!
