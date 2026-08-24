/**
 * ════════════════════════════════════════════════════════════════════
 *  PayomboyZ HUB — Node.js Express Backend & Local Database Server
 * ════════════════════════════════════════════════════════════════════
 *  Author: PayomboyZ Store Engine
 *  Description: Handles Auth, TrueMoney Top-up, Stock, Purchases & Webhooks
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// Middleware
app.set('trust proxy', true);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ ไม่สามารถเชื่อมต่อกับฐานข้อมูล SQLite:', err.message);
  } else {
    console.log('✅ เชื่อมต่อฐานข้อมูล SQLite สำเร็จ (database.db)');
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance REAL DEFAULT 0,
        discord_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock keys table
    db.run(`
      CREATE TABLE IF NOT EXISTS stock_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tier TEXT NOT NULL, -- 'vip' หรือ 'vvip'
        key_code TEXT NOT NULL,
        is_used INTEGER DEFAULT 0,
        used_by TEXT,
        used_at DATETIME
      )
    `);

    // Sales history table
    db.run(`
      CREATE TABLE IF NOT EXISTS sales_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        tier TEXT NOT NULL,
        key_code TEXT NOT NULL,
        price REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Topup logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS topup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        voucher_code TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // App settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Default admin password & webhook settings
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'St@313326339')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_username', 'payomadmin')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('discord_webhook', '')`);
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('truemoney_phone', '0623624327')`);
  });
}

// ── 1. AUTH ROUTES ──────────────────────────────────────────────────

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
      [username, hash],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว' });
          }
          return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดของระบบฐานข้อมูล' });
        }
        return res.json({
          success: true,
          message: 'สมัครสมาชิกสำเร็จ!',
          user: { username: username, balance: 0, keys: [] }
        });
      }
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ success: false, message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // Get user purchased keys with 3-month timestamp expiration calculations
    db.all(`SELECT key_code, tier, created_at FROM sales_logs WHERE username = ? ORDER BY id DESC`, [username], (err, logs) => {
      const keys = logs ? logs.map(l => {
        const createdAtDate = l.created_at ? new Date(l.created_at) : new Date();
        const expireDate = new Date(createdAtDate.getTime() + (90 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const diffMs = expireDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const isExpired = diffMs <= 0;

        return {
          key: l.key_code,
          code: l.key_code,
          tier: (l.tier || 'VIP').toUpperCase(),
          date: l.created_at,
          created_at: l.created_at,
          expires_at: expireDate.toISOString(),
          days_left: daysLeft,
          is_expired: isExpired,
          status: isExpired ? 'EXPIRED' : 'ACTIVE'
        };
      }) : [];
      return res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ!',
        user: {
          username: user.username,
          balance: user.balance,
          keys: keys
        }
      });
    });
  });
});

// Fetch User Profile & Purchase History
app.get('/api/user/profile', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  db.get(`SELECT username, balance, discord_id FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    db.all(`SELECT key_code, tier, created_at FROM sales_logs WHERE username = ? ORDER BY id DESC`, [username], (err, logs) => {
      const keys = logs ? logs.map(l => {
        const createdAtDate = l.created_at ? new Date(l.created_at) : new Date();
        const expireDate = new Date(createdAtDate.getTime() + (90 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const diffMs = expireDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const isExpired = diffMs <= 0;

        return {
          key: l.key_code,
          code: l.key_code,
          tier: (l.tier || 'VIP').toUpperCase(),
          date: l.created_at,
          created_at: l.created_at,
          expires_at: expireDate.toISOString(),
          days_left: daysLeft,
          is_expired: isExpired,
          status: isExpired ? 'EXPIRED' : 'ACTIVE'
        };
      }) : [];
      return res.json({
        success: true,
        user: {
          username: user.username,
          balance: user.balance,
          discordId: user.discord_id,
          keys: keys
        }
      });
    });
  });
});

// Discord OAuth2 Redirect & Callback Engine
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1541441062248128624';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'ltpM3j34Fx6ue2l5VHiCuawVAzqeez3w';
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '0adaf0f96d39c56d27cd7824dd6fc64e0b5d6b94dd3fabd333bb48b59e2c0cd1';

function getDiscordRedirectUri(req) {
  const host = req.get('host');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${host}/api/auth/discord/callback`;
}

app.get('/api/auth/discord', (req, res) => {
  const redirectUri = encodeURIComponent(getDiscordRedirectUri(req));
  const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  res.redirect(discordAuthUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Authorization code missing');

  try {
    const redirectUri = getDiscordRedirectUri(req);
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const discordUser = userRes.data;
    const username = `${discordUser.username}_Discord`;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, existing) => {
      let balance = 0;
      if (!existing) {
        db.run(`INSERT INTO users (username, password_hash, discord_id) VALUES (?, ?, ?)`, [username, 'DISCORD_OAUTH', discordUser.id]);
      } else {
        balance = existing.balance || 0;
      }
      db.all(`SELECT key_code, tier, created_at FROM sales_logs WHERE username = ? ORDER BY id DESC`, [username], (err, logs) => {
        const keys = logs ? logs.map(l => ({ code: l.key_code, tier: l.tier, date: l.created_at })) : [];
        res.send(`
          <script>
            localStorage.setItem('payomboy_user', JSON.stringify({
              username: '${username}',
              discordId: '${discordUser.id}',
              balance: ${balance},
              keys: ${JSON.stringify(keys)}
            }));
            window.location.href = '/index.html';
          </script>
        `);
      });
    });
  } catch (err) {
    console.error('Discord OAuth Error Details:', err.response ? err.response.data : err.message);
    const errMsg = err.response && err.response.data && err.response.data.error_description 
      ? err.response.data.error_description 
      : (err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message);
    res.status(500).send('Discord OAuth Login Error: ' + errMsg);
  }
});

// ── 2. STORE & STOCK ROUTES ──────────────────────────────────────────

// Fetch stock counts
app.get('/api/stock', (req, res) => {
  db.all(`SELECT tier, COUNT(*) as count FROM stock_keys WHERE is_used = 0 GROUP BY tier`, [], (err, rows) => {
    let vip = 0;
    let vvip = 0;
    if (rows) {
      rows.forEach(r => {
        if (r.tier === 'vip') vip = r.count;
        if (r.tier === 'vvip') vvip = r.count;
      });
    }
    return res.json({ success: true, stock: { vip, vvip } });
  });
});

// Buy key
app.post('/api/buy', (req, res) => {
  const { username, tier } = req.body; // tier: 'vip' (89฿) หรือ 'vvip' (129฿)
  const price = tier === 'vip' ? 89 : tier === 'vvip' ? 129 : null;

  if (!username || !price) {
    return res.status(400).json({ success: false, message: 'ข้อมูลการสั่งซื้อไม่ถูกต้อง' });
  }

  // Check user balance
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ' });
    }

    if (user.balance < price) {
      return res.status(400).json({ success: false, message: `ยอดเงินของคุณไม่พอ (คงเหลือ ${user.balance}฿ ต้องการ ${price}฿)` });
    }

    // Find available key in stock
    db.get(`SELECT * FROM stock_keys WHERE tier = ? AND is_used = 0 ORDER BY id ASC LIMIT 1`, [tier], (err, stockKey) => {
      if (err || !stockKey) {
        return res.status(400).json({ success: false, message: `สินค้าหมดชั่วคราว! กรุณารอ Admin เติมคีย์ ${tier.toUpperCase()}` });
      }

      // Execute purchase transaction
      db.serialize(() => {
        // Mark key as used
        db.run(`UPDATE stock_keys SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?`, [username, stockKey.id]);

        // Deduct user balance
        const newBalance = user.balance - price;
        db.run(`UPDATE users SET balance = ? WHERE username = ?`, [newBalance, username]);

        // Record sale log
        db.run(`INSERT INTO sales_logs (username, tier, key_code, price) VALUES (?, ?, ?, ?)`, [username, tier, stockKey.key_code, price]);

        // Trigger Discord Webhook Notification
        sendDiscordWebhookNotification(username, tier, stockKey.key_code, price);

        return res.json({
          success: true,
          message: 'สั่งซื้อสำเร็จ!',
          key: stockKey.key_code,
          newBalance: newBalance
        });
      });
    });
  });
});

// ── 3. TRUEMONEY VOUCHER TOP-UP ─────────────────────────────────────

app.post('/api/topup/truemoney', async (req, res) => {
  const { username, voucherUrl } = req.body;
  if (!username || !voucherUrl) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ Username และลิงก์ซองทรูมันนี่' });
  }

  // Extract voucher code from URL
  const match = voucherUrl.match(/v=([a-zA-Z0-9]+)/);
  const voucherCode = match ? match[1] : voucherUrl.trim();

  if (!voucherCode) {
    return res.status(400).json({ success: false, message: 'รูปแบบลิงก์ซองทรูมันนี่วอลเล็ทไม่ถูกต้อง' });
  }

  // Check if voucher was already used in DB
  db.get(`SELECT * FROM topup_logs WHERE voucher_code = ?`, [voucherCode], async (err, existing) => {
    if (existing) {
      return res.status(400).json({ success: false, message: 'ซองทรูมันนี่นี้ถูกใช้งานไปแล้ว' });
    }

    // Get admin truemoney phone setting
    db.get(`SELECT value FROM settings WHERE key = 'truemoney_phone'`, async (err, settingRow) => {
      const mobilePhone = (settingRow && settingRow.value) 
        ? settingRow.value 
        : (process.env.TRUEMONEY_PHONE || '0623624327');

      if (mobilePhone === '0900000000') {
        // Fallback for test mode if admin phone has not been configured in admin panel yet
        const mockAmount = 100;
        db.get(`SELECT balance FROM users WHERE username = ?`, [username], (err, user) => {
          if (!user) return res.status(400).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
          
          const newBal = (user.balance || 0) + mockAmount;
          db.run(`UPDATE users SET balance = ? WHERE username = ?`, [newBal, username]);
          db.run(`INSERT INTO topup_logs (username, voucher_code, amount) VALUES (?, ?, ?)`, [username, voucherCode, mockAmount]);

          return res.json({
            success: true,
            message: `🎉 [Demo Mode] เติมเงินสำเร็จ ${mockAmount} บาท! (กรุณาไปที่หน้า Admin เพื่อตั้งค่าเบอร์ TrueMoney รับเงินจริง)`,
            amount: mockAmount,
            newBalance: newBal
          });
        });
        return;
      }

      try {
        // Execute request to Official TrueMoney Voucher Redeem API
        const response = await axios.post(`https://gift.truemoney.com/v2/campaign/vouchers/${voucherCode}/redeem`, {
          mobile: mobilePhone,
          voucher_hash: voucherCode
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        });

        const resData = response.data;
        if (resData && resData.status && resData.status.code === 'SUCCESS') {
          const amount = parseFloat(resData.data.voucher.amount_baht);
          
          db.get(`SELECT balance FROM users WHERE username = ?`, [username], (err, user) => {
            if (!user) return res.status(400).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
            
            const newBal = (user.balance || 0) + amount;
            db.run(`UPDATE users SET balance = ? WHERE username = ?`, [newBal, username]);
            db.run(`INSERT INTO topup_logs (username, voucher_code, amount) VALUES (?, ?, ?)`, [username, voucherCode, amount]);

            return res.json({
              success: true,
              message: `🎉 เติมเงินสำเร็จ ${amount} บาท!`,
              amount: amount,
              newBalance: newBal
            });
          });
        } else {
          const msg = resData && resData.status ? resData.status.message : 'ซองทรูมันนี่ไม่ถูกต้องหรือหมดอายุแล้ว';
          return res.status(400).json({ success: false, message: msg });
        }
      } catch (apiErr) {
        const errorMsg = apiErr.response && apiErr.response.data && apiErr.response.data.status 
          ? apiErr.response.data.status.message 
          : 'เกิดข้อผิดพลาดในการตรวจสอบซองทรูมันนี่ หรือซองไม่ถูกต้อง';
        return res.status(400).json({ success: false, message: errorMsg });
      }
    });
  });
});

// ── 4. ADMIN BACKOFFICE & SECURITY ENGINE ────────────────────────────

// Admin Security Middleware
function requireAdminAuth(req, res, next) {
  const adminToken = req.headers['x-admin-token'] || req.body.adminToken || req.query.adminToken;
  if (!adminToken) {
    return res.status(401).json({ success: false, message: '🔒 ปฏิเสธการเข้าถึง: ต้องการสิทธิ์ Admin' });
  }

  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, [], (err, settingPass) => {
    db.get(`SELECT value FROM settings WHERE key = 'admin_username'`, [], (err, settingUser) => {
      const adminPass = settingPass ? settingPass.value : 'St@313326339';
      const adminUser = settingUser ? settingUser.value : 'payomadmin';
      const expectedToken = Buffer.from(`PAYOMBOYZ_ADMIN_${adminUser}_${adminPass}`).toString('base64');
      if (adminToken === expectedToken) {
        return next();
      }
      return res.status(403).json({ success: false, message: '⛔ สิทธิ์การเข้าถึง Admin ไม่ถูกต้อง' });
    });
  });
}

// Admin Auth Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, [], (err, settingPass) => {
    db.get(`SELECT value FROM settings WHERE key = 'admin_username'`, [], (err, settingUser) => {
      const adminPass = settingPass ? settingPass.value : 'St@313326339';
      const adminUser = settingUser ? settingUser.value : 'payomadmin';

      if (username === adminUser && password === adminPass) {
        const adminToken = Buffer.from(`PAYOMBOYZ_ADMIN_${adminUser}_${adminPass}`).toString('base64');
        return res.json({ success: true, message: 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ', adminToken });
      }
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่าน Admin ไม่ถูกต้อง' });
    });
  });
});

// Get Admin Stats & Secret Stock Keys (PROTECTED)
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  db.all(`SELECT * FROM sales_logs ORDER BY id DESC`, [], (err, logs) => {
    db.all(`SELECT tier, key_code FROM stock_keys WHERE is_used = 0`, [], (err, stock) => {
      db.all(`SELECT * FROM topup_logs ORDER BY id DESC LIMIT 50`, [], (err, topups) => {
        const vipKeys = stock ? stock.filter(s => s.tier === 'vip').map(s => s.key_code) : [];
        const vvipKeys = stock ? stock.filter(s => s.tier === 'vvip').map(s => s.key_code) : [];
        const totalRevenue = logs ? logs.reduce((sum, l) => sum + l.price, 0) : 0;

        return res.json({
          success: true,
          stats: {
            totalRevenue,
            totalSales: logs ? logs.length : 0,
            salesLogs: logs || [],
            topupLogs: topups || [],
            vipKeys,
            vvipKeys
          }
        });
      });
    });
  });
});

// Get User List (PROTECTED)
app.get('/api/admin/users', requireAdminAuth, (req, res) => {
  db.all(`SELECT id, username, balance, discord_id, created_at FROM users ORDER BY id DESC`, [], (err, users) => {
    if (err) return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสมาชิกได้' });
    return res.json({ success: true, users: users || [] });
  });
});

// Update Admin Stock (PROTECTED)
app.post('/api/admin/stock', requireAdminAuth, (req, res) => {
  const { vipKeys, vvipKeys } = req.body;

  db.serialize(() => {
    db.run(`DELETE FROM stock_keys WHERE is_used = 0`);

    if (Array.isArray(vipKeys)) {
      vipKeys.forEach(k => {
        if (k.trim()) db.run(`INSERT INTO stock_keys (tier, key_code) VALUES ('vip', ?)`, [k.trim()]);
      });
    }

    if (Array.isArray(vvipKeys)) {
      vvipKeys.forEach(k => {
        if (k.trim()) db.run(`INSERT INTO stock_keys (tier, key_code) VALUES ('vvip', ?)`, [k.trim()]);
      });
    }

    return res.json({ success: true, message: 'อัปเดตสต็อกคีย์เรียบร้อยแล้ว!' });
  });
});

// Change Admin Password (PROTECTED)
app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)`, [newPassword.trim()], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' });
    const newAdminToken = Buffer.from(`PAYOMBOYZ_ADMIN_${newPassword.trim()}`).toString('base64');
    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านแอดมินสำเร็จ!', adminToken: newAdminToken });
  });
});

// Set Webhook (PROTECTED)
app.post('/api/admin/webhook', requireAdminAuth, (req, res) => {
  const { webhookUrl } = req.body;
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('discord_webhook', ?)`, [webhookUrl || '']);
  return res.json({ success: true, message: 'บันทึก Discord Webhook URL สำเร็จ' });
});

// Discord Webhook Helper
function sendDiscordWebhookNotification(username, tier, key, price) {
  db.get(`SELECT value FROM settings WHERE key = 'discord_webhook'`, [], (err, setting) => {
    if (!setting || !setting.value) return;

    axios.post(setting.value, {
      username: "PayomboyZ Sales Bot",
      embeds: [{
        title: "🛒 มีคำสั่งซื้อใหม่สำเร็จ!",
        color: tier === 'vvip' ? 15844367 : 14427686,
        fields: [
          { name: "👤 ผู้ซื้อ", value: username, inline: true },
          { name: "📦 สินค้า", value: tier.toUpperCase(), inline: true },
          { name: "💰 ราคา", value: `${price} บาท`, inline: true },
          { name: "🔑 คีย์ที่ได้รับ", value: `\`\`\`${key}\`\`\``, inline: false }
        ],
        timestamp: new Date().toISOString()
      }]
    }).catch(e => console.error('Webhook Send Error:', e.message));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 PayomboyZ HUB Server พร้อมทำงานบนพอร์ต http://localhost:${PORT}`);
});
