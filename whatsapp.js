module.exports = function (io) {
    const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');
    const express = require('express');
    const os = require('os');
    
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });
    
    let qrCode = null;

    client.on('qr', (qr) => {
        qrCode = qr;
        qrcode.generate(qr, { small: true });
        io.emit('qr', qr);
    });

    client.on('authenticated', () => {
        console.log('Authenticated');
        qrCode = null;
        io.emit('authenticated');
    });

    client.on('auth_failure', (msg) => {
        console.error('Authentication failure:', msg);
        io.emit('auth_failure', msg);
    });

    client.on('ready', async () => {
        console.log('Client is ready!');
        io.emit('ready');
    });

    // Listen for messages
    client.on('message_create', async (msg) => {
        console.log(`Received message from ${msg.from}: ${msg.body}`);
        
        if (msg.body === '!system') {
            const systemInfo = 
                "💻 System Information:\n\n" +
                `🖥️ Platform: ${os.platform()}\n` +
                `🏗️ Architecture: ${os.arch()}\n` +
                `📊 CPU Cores: ${os.cpus().length}\n` +
                `💾 Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB\n` +
                `🆓 Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB\n` +
                `⏱️ Uptime: ${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m\n` +
                `🏠 Hostname: ${os.hostname()}\n` +
                `👤 User: ${os.userInfo().username}\n` +
                `📂 Node.js Version: ${process.version}`;
            
            await msg.reply(systemInfo);
            return;
        }
    });

    // HTTP API
    const app = express();
    app.get('/', async (req, res) => {
        const { send, photo, jid } = req.query;
        
        try {
            if (!jid) {
                res.status(400).send('❌ Missing required parameter: jid. Use ?jid=<target_jid>&send=<message>&photo=<url>');
                return;
            }

            if (photo && send) {
                const media = await MessageMedia.fromUrl(photo);
                await client.sendMessage(jid, media, { caption: send });
                res.send('✅ Photo with caption sent!');
            } else if (send) {
                await client.sendMessage(jid, send);
                res.send('✅ Text message sent!');
            } else {
                res.send('❌ Missing parameters. Use ?jid=<target_jid>&send=<message>&photo=<url>');
            }
        } catch (error) {
            console.error('Error sending via HTTP:', error);
            res.status(500).send(`❌ Error: ${error.message}`);
        }
    });

    // Start HTTP server
    const PORT = 3031;
    app.listen(PORT, () => {
        console.log(`HTTP API listening on port ${PORT}`);
    });

    client.initialize();
    return client;
};
