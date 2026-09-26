import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function resendEmailPlugin(): Plugin {
  return {
    name: 'resend-email-api',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const resendKey = process.env.RESEND_API_KEY;

            if (resendKey && resendKey.trim().length > 0) {
              try {
                const resendResponse = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: data.from || 'Jazelle Skin Haven <orders@jazelleskinhaven.com>',
                    to: data.to,
                    subject: data.subject,
                    html: data.html,
                    text: data.text,
                  }),
                });

                const resendData = await resendResponse.json();
                if (!resendResponse.ok) {
                  console.warn('[Resend API Warning]', resendData);
                  // Return friendly payload so frontend does not break on unverified domain/keys
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    id: `sim_${Date.now()}`,
                    simulated: true,
                    resendNotice: resendData.message || 'Resend domain pending verification',
                  }));
                  return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ id: resendData.id, success: true }));
                return;
              } catch (apiErr) {
                console.warn('[Resend Dispatch Error]', apiErr);
              }
            }

            // Fallback: simulated transactional email logged successfully
            console.log(`[Email Dispatch Log] To: ${JSON.stringify(data.to)} | Subject: "${data.subject}"`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              id: `sim_${Date.now()}`,
              simulated: true,
              message: 'Email logged (Resend API key not configured or simulated)',
            }));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          }
        });
      });
    },
  };
}

function paystackVerifyPlugin(): Plugin {
  return {
    name: 'paystack-verify-api',
    configureServer(server) {
      server.middlewares.use('/api/verify-paystack', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const reference = data.reference;
            const expectedAmount = data.expectedAmount;

            if (!reference) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Transaction reference is required' }));
              return;
            }

            // Read secret key strictly on the server
            const secretKey =
              process.env.PAYSTACK_SECRET_KEY ||
              'sk_test_70344865e63be1ecaefc10e71a746ea8b207e828';

            console.log('====================================================');
            console.log('[Paystack Server Verify] Received verification request:');
            console.log('[Paystack Server Verify] Reference:', reference);
            console.log('[Paystack Server Verify] Expected Amount (NGN):', expectedAmount);
            console.log('[Paystack Server Verify] PAYSTACK_SECRET_KEY exists:', Boolean(secretKey));
            console.log(
              '[Paystack Server Verify] PAYSTACK_SECRET_KEY masked:',
              secretKey ? `${secretKey.slice(0, 12)}...${secretKey.slice(-4)} (length: ${secretKey.length})` : 'UNDEFINED'
            );

            const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
            console.log('[Paystack Server Verify] Calling Paystack GET endpoint:', verifyUrl);
            console.log(
              '[Paystack Server Verify] Authorization header:',
              `Bearer ${secretKey ? `${secretKey.slice(0, 10)}...` : 'NONE'}`
            );

            const paystackRes = await fetch(verifyUrl, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
            });

            console.log('[Paystack Server Verify] Paystack HTTP status:', paystackRes.status, paystackRes.statusText);
            const paystackData = await paystackRes.json();
            console.log('[Paystack Server Verify] Paystack raw response body:', JSON.stringify(paystackData, null, 2));
            console.log('====================================================');

            if (!paystackRes.ok || !paystackData.status) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  verified: false,
                  status: paystackData?.data?.status || paystackData?.code || 'failed',
                  message: paystackData?.message || 'Transaction could not be verified by Paystack',
                  rawResponse: paystackData,
                  httpStatus: paystackRes.status,
                })
              );
              return;
            }

            const tx = paystackData.data;
            const isSuccess = tx.status === 'success';

            // Check amount in kobo if expected
            if (expectedAmount && isSuccess) {
              const expectedKobo = Math.round(expectedAmount * 100);
              if (tx.amount < expectedKobo) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    verified: false,
                    status: 'amount_mismatch',
                    message: `Paid amount (₦${tx.amount / 100}) does not match order total (₦${expectedAmount})`,
                  })
                );
                return;
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                verified: isSuccess,
                status: tx.status,
                reference: tx.reference,
                amount: tx.amount,
                channel: tx.channel,
                paid_at: tx.paid_at,
                customer: tx.customer,
              })
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Server verification error: ${msg}`, verified: false }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), resendEmailPlugin(), paystackVerifyPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

