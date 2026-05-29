const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CoPea signalling server OK');
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

console.log(`CoPea signaling server on port ${PORT}`);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on port ${PORT}`);
});

wss.on('connection', (ws) => {
  let myCode = null, myRole = null;
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    const { type, code } = msg;
    if (type === 'create') {
      if (rooms.has(code)) {
        const old = rooms.get(code);
        try { old.host?.close(); } catch(_) {}
        try { old.guest?.close(); } catch(_) {}
        rooms.delete(code);
      }
      myCode = code; myRole = 'host';
      rooms.set(code, { host: ws, guest: null });
      ws.send(JSON.stringify({ type: 'created', code }));
    } else if (type === 'join') {
      const room = rooms.get(code);
      if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'Room not found.' })); return; }
      if (room.guest && room.guest.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full.' })); return;
      }
      myCode = code; myRole = 'guest'; room.guest = ws;
      room.host.send(JSON.stringify({ type: 'guest-joined' }));
      ws.send(JSON.stringify({ type: 'joined' }));
    } else if (['offer','answer','ice-candidate'].includes(type)) {
      const room = rooms.get(myCode); if (!room) return;
      const target = myRole === 'host' ? room.guest : room.host;
      if (target?.readyState === WebSocket.OPEN) target.send(JSON.stringify(msg));
    }
  });
  ws.on('close', () => {
    if (!myCode) return;
    const room = rooms.get(myCode); if (!room) return;
    const other = myRole === 'host' ? room.guest : room.host;
    if (other?.readyState === WebSocket.OPEN)
      other.send(JSON.stringify({ type: 'peer-disconnected' }));
    rooms.delete(myCode);
  });
  ws.on('error', () => {});
});
