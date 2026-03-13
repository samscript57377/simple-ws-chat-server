const websocket = require('ws');
const http = require('http');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 8080;

const server = http.createServer();
const wsserver = new websocket.Server({ server });

const rooms = {};
const clients = {};

generateJoinMessage = (username) => {
    const message = [
        `${username} hopped into the room!`,
        `Welcome ${username} to the room!`,
        `Hey ${username}, glad to have you here!`,
        `Look who's here! It's ${username}!`,
        `Everyone, please welcome ${username} to the room!`,
        `Say hello to ${username}!`,
        `A wild ${username} appeared!`,
        `Guess who's here? It's ${username}!`,
        `Everyone, meet ${username}!`,
        `Let's give a warm welcome to ${username}!`,
        `${username} just joined the party!`,
        `W in the chat! ${username} is here!`,
        `We hope you enjoy your stay, ${username}!`,
        `Welcome aboard, ${username}!`,
        `Hi ${username}, hope you brought pizza!`
    ];
    return message[Math.floor(Math.random() * message.length)];
};

wsserver.on('connection', (ws) => {
    const clientId = typeof randomUUID === 'function' ? randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    console.log('Client connected: ', ws._socket.remoteAddress, ' with client ID: ', clientId);
    clients[clientId] = "unnamed_user" + Math.floor(Math.random() * 1000);
    ws.id = clientId;

    ws.on('message', (data) => {
        console.log(`Received message: ${data}`);
        let messageObj;
        try {
            messageObj = JSON.parse(data);
        } catch (e) {
            console.error('Invalid JSON received');
            return;
        }

        const { type, roomId, username, sender, str, style, emoji } = messageObj;

        if (type === 'join') {
            const finalUsername = username || clients[ws.id];
            clients[ws.id] = finalUsername;

            if (!rooms[roomId]) {
                rooms[roomId] = {
                    clients: [ws],
                    messages: [{
                        sender: { username: "Chatguard", uuid: null, color: "#9b39d5" },
                        str: `Welcome in room ${roomId}\nPlease be kind and follow the guidelines`,
                        style: { color: "#22283b" }
                    }]
                };
            } else {
                rooms[roomId].clients.push(ws);
                const joinMsg = {
                    sender: { username: "Chatguard", uuid: null, color: "#9b39d5" },
                    str: generateJoinMessage(finalUsername),
                    style: { color: "#22283b" }
                };
                rooms[roomId].messages.push(joinMsg);
                for (const client of rooms[roomId].clients) {
                    if (client.readyState === websocket.OPEN) {
                        client.send(JSON.stringify({ type: "join", message: joinMsg }));
                    }
                }
            }
            return;
        }

        let currentRoomId;
        for (const id in rooms) {
            if (rooms[id].clients.includes(ws)) {
                currentRoomId = id;
                break;
            }
        }
        if (!currentRoomId) return;

        if (type === 'message') {
            const msg = { sender, str, style };
            rooms[currentRoomId].messages.push(msg);
            for (const client of rooms[currentRoomId].clients) {
                if (client.readyState === websocket.OPEN) {
                    client.send(JSON.stringify({ type: "message", message: msg }));
                }
            }
            return;
        }

        if (type === 'emoji') {
            const msg = { sender, emoji, style };
            rooms[currentRoomId].messages.push(msg);
            for (const client of rooms[currentRoomId].clients) {
                if (client.readyState === websocket.OPEN) {
                    client.send(JSON.stringify({ type: "emoji", message: msg }));
                }
            }
            return;
        }
    });


    ws.on('close', () => {
        console.log('Client disconnected: ', ws._socket.remoteAddress);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.clients = room.clients.filter(client => client !== ws);
            if (room.clients.length === 0) {
                delete rooms[roomId];
            }
        }
        delete clients[ws.id];
    });
});

server.listen(PORT, () => {
    console.log(`WebSocket server is running a chat on port ${PORT}`);
});