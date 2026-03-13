const WebSocket = require('ws');
const http = require('http');
const { EventEmitter } = require('events');

// Mock the actual server module
let wsserver;
let server;
let PORT = 8081;

const rooms = {};
const clients = {};

// Function from index.js
const generateJoinMessage = (username) => {
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

// Setup server before tests
beforeAll((done) => {
    server = http.createServer();
    wsserver = new WebSocket.Server({ server });

    const { randomUUID } = require('crypto');
    wsserver.on('connection', (ws) => {
        const clientId = typeof randomUUID === 'function' ? randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
        clients[clientId] = "unnamed_user" + Math.floor(Math.random() * 1000);
        ws.id = clientId;

        ws.on('message', (data) => {
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
                        if (client.readyState === WebSocket.OPEN) {
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
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "message", message: msg }));
                    }
                }
                return;
            }

            if (type === 'emoji') {
                const msg = { sender, emoji, style };
                rooms[currentRoomId].messages.push(msg);
                for (const client of rooms[currentRoomId].clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: "emoji", message: msg }));
                    }
                }
                return;
            }
        });

        ws.on('close', () => {
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
        done();
    });
});

// Cleanup after tests
afterAll((done) => {
    wsserver.close();
    server.close(() => {
        done();
    });
});

// Clear rooms and clients before each test
beforeEach(() => {
    for (const key in rooms) delete rooms[key];
    for (const key in clients) delete clients[key];
});

describe('WebSocket Chat Server', () => {
    describe('Connection Management', () => {
        test('should accept a client connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });
            ws.on('error', (err) => {
                done(err);
            });
        });

        test('should assign a client ID on connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                // Give server time to process connection
                setTimeout(() => {
                    expect(Object.keys(clients).length).toBeGreaterThan(0);
                    ws.close();
                    done();
                }, 100);
            });
        });

        test('should remove client on disconnect', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                const clientCount = Object.keys(clients).length;
                ws.close();
                setTimeout(() => {
                    expect(Object.keys(clients).length).toBeLessThan(clientCount);
                    done();
                }, 100);
            });
        });
    });

    describe('Room Management', () => {
        test('should create a new room when user joins', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'testuser'
                }));
                setTimeout(() => {
                    expect(rooms['room1']).toBeDefined();
                    expect(rooms['room1'].clients.length).toBe(1);
                    ws.close();
                    done();
                }, 100);
            });
        });

        test('should add user to existing room', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room1',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        expect(rooms['room1'].clients.length).toBe(2);
                        ws1.close();
                        ws2.close();
                        done();
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });

        test('should store initial welcome message in room', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'testuser'
                }));
                setTimeout(() => {
                    expect(rooms['room1'].messages.length).toBeGreaterThan(0);
                    const welcomeMsg = rooms['room1'].messages[0];
                    expect(welcomeMsg.sender.username).toBe('Chatguard');
                    expect(welcomeMsg.str).toContain('Welcome in room room1');
                    ws.close();
                    done();
                }, 100);
            });
        });

        test('should delete empty room when last user leaves', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'testuser'
                }));
                setTimeout(() => {
                    expect(rooms['room1']).toBeDefined();
                    ws.close();
                    setTimeout(() => {
                        expect(rooms['room1']).toBeUndefined();
                        done();
                    }, 100);
                }, 100);
            });
        });

        test('should keep room when other users remain', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room1',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        ws1.close();
                        setTimeout(() => {
                            expect(rooms['room1']).toBeDefined();
                            expect(rooms['room1'].clients.length).toBe(1);
                            ws2.close();
                            done();
                        }, 100);
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });
    });

    describe('Join Message', () => {
        test('should broadcast join message to all users in room', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                
                let receivedJoinMessage = false;
                ws1.on('message', (msg) => {
                    const data = JSON.parse(msg);
                    if (data.type === 'join') {
                        receivedJoinMessage = true;
                    }
                });

                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room1',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        expect(receivedJoinMessage).toBe(true);
                        ws1.close();
                        ws2.close();
                        done();
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });

        test('should generate random join message', () => {
            const msg1 = generateJoinMessage('Alice');
            const msg2 = generateJoinMessage('Bob');
            expect(msg1).toContain('Alice');
            expect(msg2).toContain('Bob');
            expect(typeof msg1).toBe('string');
            expect(msg1.length).toBeGreaterThan(0);
        });

        test('should set default username if not provided', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1'
                }));
                setTimeout(() => {
                    expect(rooms['room1'].clients.length).toBe(1);
                    ws.close();
                    done();
                }, 100);
            });
        });
    });

    describe('Message Handling', () => {
        test('should broadcast regular messages to room', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                
                let receivedMessage = false;
                ws2.on('message', (msg) => {
                    const data = JSON.parse(msg);
                    if (data.type === 'message' && data.message.str === 'Hello everyone!') {
                        receivedMessage = true;
                    }
                });

                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room1',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        ws1.send(JSON.stringify({
                            type: 'message',
                            sender: { username: 'user1', color: '#ff0000' },
                            str: 'Hello everyone!',
                            style: { color: '#ff0000' }
                        }));
                        setTimeout(() => {
                            expect(receivedMessage).toBe(true);
                            ws1.close();
                            ws2.close();
                            done();
                        }, 100);
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });

        test('should store messages in room history', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'message',
                        sender: { username: 'user1', color: '#ff0000' },
                        str: 'Test message',
                        style: { color: '#ff0000' }
                    }));
                    setTimeout(() => {
                        expect(rooms['room1'].messages.length).toBe(2); // welcome + message
                        expect(rooms['room1'].messages[1].str).toBe('Test message');
                        ws.close();
                        done();
                    }, 100);
                }, 100);
            });
        });

        test('should handle messages with styling', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'message',
                        sender: { username: 'user1', color: '#00ff00' },
                        str: 'Styled message',
                        style: { color: '#00ff00', fontSize: '16px' }
                    }));
                    setTimeout(() => {
                        const msg = rooms['room1'].messages[1];
                        expect(msg.style.color).toBe('#00ff00');
                        expect(msg.style.fontSize).toBe('16px');
                        ws.close();
                        done();
                    }, 100);
                }, 100);
            });
        });
    });

    describe('Emoji Handling', () => {
        test('should broadcast emoji messages to room', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                
                let receivedEmoji = false;
                ws2.on('message', (msg) => {
                    const data = JSON.parse(msg);
                    if (data.type === 'emoji' && data.message.emoji === '😀') {
                        receivedEmoji = true;
                    }
                });

                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room1',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        ws1.send(JSON.stringify({
                            type: 'emoji',
                            sender: { username: 'user1', color: '#ff0000' },
                            emoji: '😀',
                            style: { color: '#ff0000' }
                        }));
                        setTimeout(() => {
                            expect(receivedEmoji).toBe(true);
                            ws1.close();
                            ws2.close();
                            done();
                        }, 100);
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });

        test('should store emoji in room history', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'emoji',
                        sender: { username: 'user1', color: '#ff0000' },
                        emoji: '👍',
                        style: { color: '#ff0000' }
                    }));
                    setTimeout(() => {
                        const msg = rooms['room1'].messages[1];
                        expect(msg.emoji).toBe('👍');
                        expect(msg.sender.username).toBe('user1');
                        ws.close();
                        done();
                    }, 100);
                }, 100);
            });
        });
    });

    describe('Invalid Data Handling', () => {
        test('should ignore invalid JSON', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    const initialCount = rooms['room1'].messages.length;
                    ws.send('invalid json {');
                    setTimeout(() => {
                        expect(rooms['room1'].messages.length).toBe(initialCount);
                        ws.close();
                        done();
                    }, 100);
                }, 100);
            });
        });

        test('should handle message from user not in a room', (done) => {
            const ws = new WebSocket(`ws://localhost:${PORT}`);
            ws.on('open', () => {
                // Try to send message without joining a room
                ws.send(JSON.stringify({
                    type: 'message',
                    sender: { username: 'user1', color: '#ff0000' },
                    str: 'Message without room',
                    style: { color: '#ff0000' }
                }));
                setTimeout(() => {
                    // Should not create any room
                    expect(Object.keys(rooms).length).toBe(0);
                    ws.close();
                    done();
                }, 100);
            });
        });
    });

    describe('Multiple Rooms', () => {
        test('should keep messages separate between rooms', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                setTimeout(() => {
                    ws1.send(JSON.stringify({
                        type: 'message',
                        sender: { username: 'user1', color: '#ff0000' },
                        str: 'Room 1 message',
                        style: { color: '#ff0000' }
                    }));
                    setTimeout(() => {
                        ws2.send(JSON.stringify({
                            type: 'join',
                            roomId: 'room2',
                            username: 'user2'
                        }));
                        setTimeout(() => {
                            ws2.send(JSON.stringify({
                                type: 'message',
                                sender: { username: 'user2', color: '#0000ff' },
                                str: 'Room 2 message',
                                style: { color: '#0000ff' }
                            }));
                            setTimeout(() => {
                                expect(rooms['room1'].messages[1].str).toBe('Room 1 message');
                                expect(rooms['room2'].messages[1].str).toBe('Room 2 message');
                                expect(rooms['room1'].messages.length).toBe(2);
                                expect(rooms['room2'].messages.length).toBe(2);
                                ws1.close();
                                ws2.close();
                                done();
                            }, 100);
                        }, 100);
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });

        test('should route messages only to room members', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${PORT}`);
            
            let connected = 0;
            const checkReady = () => {
                connected++;
                if (connected === 2) proceedWithTest();
            };

            const proceedWithTest = () => {
                ws1.send(JSON.stringify({
                    type: 'join',
                    roomId: 'room1',
                    username: 'user1'
                }));
                
                let receivedWrongMessage = false;
                ws2.on('message', (msg) => {
                    const data = JSON.parse(msg);
                    if (data.type === 'message' && data.message.str === 'Room 1 message') {
                        receivedWrongMessage = true;
                    }
                });

                setTimeout(() => {
                    ws2.send(JSON.stringify({
                        type: 'join',
                        roomId: 'room2',
                        username: 'user2'
                    }));
                    setTimeout(() => {
                        ws1.send(JSON.stringify({
                            type: 'message',
                            sender: { username: 'user1', color: '#ff0000' },
                            str: 'Room 1 message',
                            style: { color: '#ff0000' }
                        }));
                        setTimeout(() => {
                            expect(receivedWrongMessage).toBe(false);
                            ws1.close();
                            ws2.close();
                            done();
                        }, 100);
                    }, 100);
                }, 100);
            };

            ws1.on('open', checkReady);
            ws2.on('open', checkReady);
        });
    });
});
