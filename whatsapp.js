module.exports = function (io) {
    const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');
    const express = require('express');
    const ngrok = require('ngrok'); // Add ngrok package

    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    let qrCode = null;
    const targetChannel = "120363421072313343@newsletter";
    const ownerNumber = "94785760531@s.whatsapp.net"; // Your number for startup message

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

        // Send startup message
        try {
            const message =
                "🚀 WhatsApp bot is now connected and ready!\n\n" +
                "Available commands:\n" +
                "!ping - Test bot response";
            await client.sendMessage(ownerNumber, message);
            console.log(`Initial message sent to ${ownerNumber}`);
        } catch (error) {
            console.error('Error sending initial message:', error);
        }
    });

    // Listen for messages
    client.on('message_create', async (msg) => {
        console.log(`Received message from ${msg.from}: ${msg.body}`);

        if (msg.body === '!ping') {
            await msg.reply('🏓 pong!');
            return;
        }
    });

    // HTTP API
    const app = express();

    app.get('/', async (req, res) => {
        const { send, photo } = req.query;
        try {
            if (photo && send) {
                const media = await MessageMedia.fromUrl(photo);
                await client.sendMessage(targetChannel, media, { caption: send });
                res.send('✅ Photo with caption sent!');
            } else if (send) {
                await client.sendMessage(targetChannel, send);
                res.send('✅ Text message sent!');
            } else {
                res.send('❌ Missing parameters. Use ?send=<message>&photo=<url>');
            }
        } catch (error) {
            console.error('Error sending via HTTP:', error);
            res.status(500).send(`❌ Error: ${error.message}`);
        }
    });

    // Start HTTP server and ngrok tunnel
    const PORT = 3001;
    app.listen(PORT, async () => {
        console.log(`HTTP API listening on port ${PORT}`);
        try {
            const url = await ngrok.connect({
                addr: PORT,
                authtoken: '310YJ450JsaCuoMLCcUcnYKn0Pt_683nLSxgjPjVYk53qzDJy', // Replace with your ngrok token
                region: 'ap'
            });
            console.log(`🌍 Public URL: ${url}`);
            io.emit('ngrok_url', url);
        } catch (err) {
            console.error('❌ Error starting ngrok:', err);
        }
    });

    client.initialize();
    return client;
};
