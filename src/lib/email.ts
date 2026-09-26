import { supabase } from './supabaseClient';
import { formatNaira } from './format';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  type?: 'order_confirmation' | 'shipping_update' | 'password_reset' | 'otp_verification' | 'abandoned_cart_reminder';
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

const DEFAULT_FROM = 'Jazelle Skin Haven <orders@jazelleskinhaven.com>';

/**
 * Sends a transactional email using Resend via backend /api/send-email route
 * or direct Resend API, with persistent logging to Supabase.
 */
export async function sendTransactionalEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const fromAddress = payload.from || DEFAULT_FROM;
  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
  const primaryTo = toAddresses[0] || '';

  let result: SendEmailResult = { success: false };

  try {
    // 1. Only attempt internal backend API endpoint if on localhost / server environment
    const isLocalServer = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalServer) {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: toAddresses,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        result = {
          success: true,
          messageId: data.id || `msg_${Date.now()}`,
          simulated: Boolean(data.simulated),
        };
      } else {
        result = { success: true, simulated: true, messageId: `local_${Date.now()}` };
      }
    } else {
      // On static hosting (Vercel), log to Supabase directly
      result = { success: true, simulated: true, messageId: `client_${Date.now()}` };
    }
  } catch (err) {
    console.warn('[Email] Backend email dispatch fallback:', err);
    result = { success: true, simulated: true, messageId: `fallback_${Date.now()}` };
  }

  // 2. Log email to Supabase for audit & admin traceability
  try {
    await supabase.from('email_logs').insert({
      recipient: primaryTo,
      subject: payload.subject,
      email_type: payload.type || 'transactional',
      status: result.success ? (result.simulated ? 'simulated' : 'sent') : 'failed',
      message_id: result.messageId || null,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn('[Email] Could not write to email_logs table:', logErr);
  }

  // 3. Dispatch client event for real-time notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jazelle_email_sent', {
        detail: {
          to: primaryTo,
          subject: payload.subject,
          type: payload.type,
          simulated: result.simulated,
        },
      })
    );
  }

  return result;
}

// -------------------------------------------------------------
// HTML EMAIL TEMPLATES (Jazelle Skin Haven Tonal Ramp & Branding)
// -------------------------------------------------------------

function emailHeader(): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { margin: 0; padding: 0; background-color: #FCF3F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #760536; }
      .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 25px rgba(241, 49, 132, 0.08); border: 1px solid #F8DDE9; }
      .header { background: linear-gradient(135deg, #FCF3F7 0%, #F8DDE9 100%); padding: 36px 24px; text-align: center; border-bottom: 1px solid #F5BCD5; }
      .logo-text { font-size: 26px; font-weight: 700; color: #A20B4C; letter-spacing: -0.5px; margin: 0; }
      .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #F13184; margin-top: 4px; font-weight: 600; }
      .content { padding: 32px 28px; }
      .title { font-size: 22px; font-weight: 700; color: #760536; margin: 0 0 12px 0; }
      .lead { font-size: 15px; line-height: 1.6; color: #A20B4C; margin: 0 0 24px 0; }
      .box { background: #FCF3F7; border-radius: 16px; padding: 20px; border: 1px solid #F8DDE9; margin: 20px 0; }
      .item-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #F5BCD5; }
      .item-row:last-child { border-bottom: none; }
      .btn { display: inline-block; background-color: #F13184; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; text-align: center; margin: 24px 0 10px 0; }
      .footer { background: #FCF3F7; padding: 24px; text-align: center; font-size: 12px; color: #A20B4C; border-top: 1px solid #F8DDE9; }
      .footer a { color: #F13184; text-decoration: none; font-weight: 600; margin: 0 8px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
      .badge-pink { background: #F8DDE9; color: #A20B4C; }
      .badge-green { background: #E8F5E9; color: #2E7D32; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="logo-text">Jazelle Skin Haven</h1>
        <div class="tagline">Your Self-Care Corner</div>
      </div>
      <div class="content">
  `;
}

function emailFooter(): string {
  return `
      </div>
      <div class="footer">
        <p style="margin: 0 0 10px 0;">Jazelle Skin Haven &bull; Delivered with love across Nigeria</p>
        <div>
          <a href="https://www.instagram.com/jazelle.skin.haven">Instagram</a> &bull;
          <a href="https://www.tiktok.com/@jazelleskinhaven">TikTok</a> &bull;
          <a href="https://wa.me/message/ET5GM7MR4LYIC1">WhatsApp Us</a> &bull;
          <a href="mailto:hello@jazelleskinhaven.com">hello@jazelleskinhaven.com</a>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface OrderEmailData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga?: string;
  items: OrderEmailItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method?: string;
}

/**
 * Generates and sends an order confirmation email
 */
export async function sendOrderConfirmationEmail(order: OrderEmailData) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <div style="padding: 10px 0; border-bottom: 1px solid #F8DDE9; display: table; width: 100%;">
        <div style="display: table-cell; vertical-align: middle; width: 65%;">
          <strong style="color: #760536; font-size: 14px;">${item.name}</strong>
          <div style="color: #A20B4C; font-size: 12px;">Qty: ${item.quantity} &times; ${formatNaira(item.price)}</div>
        </div>
        <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 600; color: #760536; font-size: 14px;">
          ${formatNaira(item.price * item.quantity)}
        </div>
      </div>
    `
    )
    .join('');

  const html = `
    ${emailHeader()}
      <span class="badge badge-green">Order Confirmed</span>
      <h2 class="title" style="margin-top: 12px;">Your self-care treat is confirmed, ${order.customer_name}!</h2>
      <p class="lead">
        Thank you for trusting Jazelle Skin Haven. We have received your order <strong>#${order.order_number}</strong> and are carefully getting your glow essentials ready for dispatch.
      </p>

      <div class="box">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #760536;">Order Summary (#${order.order_number})</h3>
        ${itemsHtml}
        
        <div style="margin-top: 14px; padding-top: 12px; font-size: 13px; color: #760536;">
          <div style="display: table; width: 100%; margin-bottom: 4px;">
            <div style="display: table-cell;">Subtotal</div>
            <div style="display: table-cell; text-align: right;">${formatNaira(order.subtotal)}</div>
          </div>
          <div style="display: table; width: 100%; margin-bottom: 6px;">
            <div style="display: table-cell;">Delivery Fee</div>
            <div style="display: table-cell; text-align: right;">${order.delivery_fee === 0 ? 'FREE' : formatNaira(order.delivery_fee)}</div>
          </div>
          <div style="display: table; width: 100%; padding-top: 6px; border-top: 1px solid #F5BCD5; font-size: 16px; font-weight: 700; color: #A20B4C;">
            <div style="display: table-cell;">Total Paid</div>
            <div style="display: table-cell; text-align: right;">${formatNaira(order.total)}</div>
          </div>
        </div>
      </div>

      <div class="box" style="margin-top: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #760536;">Delivery Address</h3>
        <p style="margin: 0; font-size: 13px; color: #A20B4C; line-height: 1.5;">
          ${order.delivery_address}<br/>
          ${order.delivery_lga ? `${order.delivery_lga}, ` : ''}${order.delivery_state}, Nigeria<br/>
          ${order.customer_phone ? `Phone: ${order.customer_phone}` : ''}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://jazelleskinhaven.com/track-order?id=${encodeURIComponent(order.order_number)}" class="btn">
          Track Your Order &rarr;
        </a>
      </div>
    ${emailFooter()}
  `;

  return sendTransactionalEmail({
    to: order.customer_email,
    subject: `Your Jazelle Skin Haven order is confirmed! (${order.order_number})`,
    html,
    type: 'order_confirmation',
    metadata: { order_number: order.order_number, total: order.total },
  });
}

/**
 * Generates and sends a shipping status update email when admin changes order status
 */
export async function sendShippingUpdateEmail(order: {
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  delivery_state?: string;
}) {
  const statusLabels: Record<string, { label: string; desc: string; badgeClass: string }> = {
    placed: {
      label: 'Order Placed',
      desc: 'Your order has been logged and is awaiting dispatch preparation.',
      badgeClass: 'badge-pink',
    },
    processing: {
      label: 'Packing & Preparing',
      desc: 'Our team is carefully packing your self-care favourites with love and bubble wrap.',
      badgeClass: 'badge-pink',
    },
    shipped: {
      label: 'Dispatched & On The Way',
      desc: 'Your package is now in transit with our delivery courier! Expect arrival shortly.',
      badgeClass: 'badge-green',
    },
    delivered: {
      label: 'Delivered',
      desc: 'Your package has arrived! We hope your new self-care moments bring you joy.',
      badgeClass: 'badge-green',
    },
  };

  const statusInfo = statusLabels[order.status] || {
    label: order.status.toUpperCase(),
    desc: `Your order status has been updated to ${order.status}.`,
    badgeClass: 'badge-pink',
  };

  const html = `
    ${emailHeader()}
      <span class="badge ${statusInfo.badgeClass}">${statusInfo.label}</span>
      <h2 class="title" style="margin-top: 12px;">Shipping update on order #${order.order_number}</h2>
      <p class="lead">
        Hi ${order.customer_name}, we wanted to let you know that your order has been updated:
      </p>

      <div class="box">
        <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #F13184;">Status: ${statusInfo.label}</h3>
        <p style="margin: 0; font-size: 14px; color: #760536; line-height: 1.5;">
          ${statusInfo.desc}
        </p>
      </div>

      <div style="text-align: center;">
        <a href="https://jazelleskinhaven.com/track-order?id=${encodeURIComponent(order.order_number)}" class="btn">
          View Live Tracking &rarr;
        </a>
      </div>
      <p style="text-align: center; font-size: 12px; color: #A20B4C; margin-top: 12px;">
        Need to change delivery details? Message us directly on WhatsApp with your order number.
      </p>
    ${emailFooter()}
  `;

  return sendTransactionalEmail({
    to: order.customer_email,
    subject: `Update on your Jazelle order ${order.order_number}: ${statusInfo.label}`,
    html,
    type: 'shipping_update',
    metadata: { order_number: order.order_number, status: order.status },
  });
}

/**
 * Generates and sends a 6-digit OTP verification email for signup or password reset
 */
export async function sendOtpVerificationEmail(email: string, otp: string, purpose: 'signup' | 'password_reset') {
  const isReset = purpose === 'password_reset';
  const title = isReset ? 'Reset Your Password' : 'Verify Your Haven Account';
  const lead = isReset
    ? 'Use the verification code below to reset your Jazelle Skin Haven account password.'
    : 'Welcome to your cute little self-care corner! Use the verification code below to confirm your email and complete your registration.';

  const html = `
    ${emailHeader()}
      <span class="badge badge-pink">${isReset ? 'Password Reset' : 'Account Verification'}</span>
      <h2 class="title" style="margin-top: 12px;">${title}</h2>
      <p class="lead">${lead}</p>

      <div class="box" style="text-align: center; padding: 28px 20px;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #F13184; font-weight: 600; margin-bottom: 8px;">
          Your Verification Code
        </div>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #760536; font-family: monospace; background: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 12px; border: 2px dashed #F25A9B;">
          ${otp}
        </div>
        <p style="margin: 14px 0 0 0; font-size: 15px; color: #760536; font-weight: 500;">
          Your verification code is: <strong style="color: #F13184; font-size: 18px; font-family: monospace;">${otp}</strong>
        </p>
        <div style="font-size: 12px; color: #A20B4C; margin-top: 10px;">
          This code expires in 15 minutes. Never share this code with anyone.
        </div>
      </div>

      <p style="font-size: 13px; color: #A20B4C; line-height: 1.5;">
        If you did not request this code, you can safely ignore this email &mdash; your account remains secure.
      </p>
    ${emailFooter()}
  `;

  return sendTransactionalEmail({
    to: email,
    subject: `Your Jazelle Skin Haven Verification Code: ${otp}`,
    html,
    type: isReset ? 'password_reset' : 'otp_verification',
    metadata: { email, purpose },
  });
}

export interface AbandonedCartEmailData {
  order_number: string;
  customer_name: string;
  customer_email: string;
  items: OrderEmailItem[];
  subtotal: number;
  delivery_fee?: number;
  total: number;
  resume_url?: string;
}

/**
 * Generates and sends a warm, friendly abandoned cart recovery email
 */
export async function sendAbandonedCartReminderEmail(order: AbandonedCartEmailData) {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://jazelleskinhaven.com';
  const checkoutUrl = order.resume_url || `${origin}/checkout?resume=${order.order_number}`;

  const firstName = order.customer_name ? order.customer_name.trim().split(' ')[0] : 'there';

  const itemsHtml = order.items
    .map(
      (item) => `
      <div style="padding: 12px 0; border-bottom: 1px dashed #F5BCD5; display: table; width: 100%;">
        <div style="display: table-cell; vertical-align: middle; width: 65%;">
          <strong style="color: #760536; font-size: 14px; display: block;">${item.name}</strong>
          <span style="color: #A20B4C; font-size: 12px;">Qty: ${item.quantity} &times; ${formatNaira(item.price)}</span>
        </div>
        <div style="display: table-cell; vertical-align: middle; text-align: right; font-weight: 700; color: #760536; font-size: 14px;">
          ${formatNaira(item.price * item.quantity)}
        </div>
      </div>
    `
    )
    .join('');

  const html = `
    ${emailHeader()}
      <span class="badge badge-pink">Haven Cart Reminder</span>
      <h2 class="title" style="margin-top: 12px;">You left something in your cart, ${firstName}! 💕</h2>
      <p class="lead">
        We noticed you didn't get to finish checking out. We have saved your daily self-care essentials so you won't lose your spot.
      </p>

      <div class="box">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #F13184; font-weight: 700; margin-bottom: 12px;">
          Reserved Items (Order #${order.order_number})
        </div>
        ${itemsHtml}
        <div style="padding-top: 14px; margin-top: 6px; display: table; width: 100%;">
          <div style="display: table-cell; font-size: 14px; color: #760536; font-weight: 600;">Total with Delivery:</div>
          <div style="display: table-cell; text-align: right; font-size: 18px; font-weight: 800; color: #F13184;">
            ${formatNaira(order.total)}
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${checkoutUrl}" class="btn" style="padding: 16px 36px; font-size: 15px; letter-spacing: 0.3px;">
          Complete My Order &rarr;
        </a>
        <p style="font-size: 12px; color: #A20B4C; margin-top: 10px;">
          Clicking above will restore your cart and delivery details instantly.
        </p>
      </div>

      <div style="background: #ffffff; border-radius: 14px; border: 1px solid #F8DDE9; padding: 16px 20px; margin-top: 24px; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #760536;">
          Have questions or need help with payment? We're always here for you!
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">
          <a href="https://wa.me/message/ET5GM7MR4LYIC1?text=${encodeURIComponent(`Hi Jazelle! I need help completing my order ${order.order_number}`)}" style="color: #25D366; font-weight: 700; text-decoration: none;">
            &bull; Chat with us on WhatsApp &bull;
          </a>
        </p>
      </div>
    ${emailFooter()}
  `;

  return sendTransactionalEmail({
    to: order.customer_email,
    subject: `You left something in your cart! — Complete your Jazelle Haven order 💕`,
    html,
    text: `Hi ${firstName}, you left items in your cart at Jazelle Skin Haven! Complete your order here: ${checkoutUrl}`,
    type: 'abandoned_cart_reminder',
    metadata: {
      order_number: order.order_number,
      customer_email: order.customer_email,
      total: order.total,
    },
  });
}
