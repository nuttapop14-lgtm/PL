/**
 * PIRUN Premier League 2026-2027
 * Automatic FPL Score Synchronizer + Firebase Realtime Sync
 * League ID: 1576349
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LEAGUE_ID = 1576349;
const STANDINGS_URL = `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE_ID}/standings/`;
const HTML_FILES = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'pl.html')
];
const JSON_FILE = path.join(__dirname, 'fpl_data.json');
const RTDB_URL = 'https://pl26-27-default-rtdb.firebaseio.com/pirun_league_state.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function pushToFirebase(payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options = {
      hostname: 'pl26-27-default-rtdb.firebaseio.com',
      path: '/pirun_league_state.json',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          console.warn('Firebase RTDB response code:', res.statusCode);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.warn('Firebase sync warning:', err.message);
      resolve(false);
    });

    req.write(dataString);
    req.end();
  });
}

async function sync() {
  console.log('====================================================');
  console.log('  ⚽ PIRUN PREMIER LEAGUE - 1-CLICK FPL SYNC ⚽');
  console.log('====================================================');
  console.log(`📡 กำลังเชื่อมต่อไปยัง Official FPL API (League: ${LEAGUE_ID})...`);

  try {
    const standingsData = await fetchJson(STANDINGS_URL);
    const leagueName = standingsData.league?.name || 'PIRUN League';
    const results = standingsData.standings?.results || [];

    console.log(`✅ พบข้อมูลลีก: "${leagueName}" ทั้งหมด ${results.length} ทีม\n`);
    console.log('⏳ กำลังดึงคะแนนย้อนหลังแต่ละ Gameweek ของทุกทีม...');

    const teams = [];
    const scores = {};
    const gwWinners = {};
    let maxGW = 1;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const teamId = i + 1;

      teams.push({
        id: teamId,
        entry: r.entry,
        name: r.entry_name,
        manager: r.player_name
      });

      // Fetch GW History
      try {
        const hist = await fetchJson(`https://fantasy.premierleague.com/api/entry/${r.entry}/history/`);
        const gwMap = {};
        if (hist.current && hist.current.length > 0) {
          hist.current.forEach(g => {
            gwMap['gw' + g.event] = g.points;
            if (g.event > maxGW) maxGW = g.event;
          });
        } else {
          gwMap['gw1'] = r.event_total || r.total;
        }
        scores[teamId] = gwMap;
      } catch (err) {
        scores[teamId] = { gw1: r.event_total || r.total };
      }

      process.stdout.write(`   ✓ [${i + 1}/${results.length}] ${r.entry_name} (${r.player_name})\n`);
    }

    // Determine Winners for each GW
    for (let gw = 1; gw <= maxGW; gw++) {
      let topScore = -1;
      let topTeamId = 1;
      for (const t of teams) {
        const sc = scores[t.id]?.['gw' + gw] || 0;
        if (sc > topScore) {
          topScore = sc;
          topTeamId = t.id;
        }
      }
      gwWinners[gw] = topTeamId;
    }

    // Ensure payments for all gameweeks up to maxGW
    let payments = {};
    try {
      const existingPayments = await fetchJson('https://pl26-27-default-rtdb.firebaseio.com/pirun_league_state/payments.json');
      if (existingPayments && typeof existingPayments === 'object') {
        payments = existingPayments;
      }
    } catch (e) {
      console.log('   (สังเกต: ไม่สามารถดึงข้อมูล payments เดิมได้ จะสร้างค่าเริ่มต้นให้)');
    }

    if (Array.isArray(payments)) {
      const pObj = {};
      payments.forEach((val, idx) => {
        if (idx > 0 && val) pObj[idx] = val;
      });
      payments = pObj;
    }

    for (let gw = 1; gw <= maxGW; gw++) {
      if (!payments[gw] || !Array.isArray(payments[gw]) || payments[gw].length === 0) {
        payments[gw] = teams.map(t => ({
          teamId: t.id,
          status: 'unpaid',
          amount: 20,
          slipUrl: '',
          time: '-'
        }));
      }
    }
    if (maxGW >= 4 && (!payments['block1'] || !Array.isArray(payments['block1']) || payments['block1'].length === 0)) {
      payments['block1'] = teams.map(t => ({
        teamId: t.id,
        status: 'unpaid',
        amount: 50,
        slipUrl: '',
        time: '-'
      }));
    }

    // Activity Logs
    let activityLogs = [];
    try {
      const existingLogs = await fetchJson('https://pl26-27-default-rtdb.firebaseio.com/pirun_league_state/activityLogs.json');
      if (Array.isArray(existingLogs)) activityLogs = existingLogs;
    } catch (e) {}

    const nowStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
                   new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    activityLogs.unshift({
      id: Date.now(),
      time: nowStr,
      icon: '⚡',
      title: `ซิงค์คะแนนสด FPL สำเร็จ (ถึง GW${maxGW})`,
      detail: `ดึงคะแนนล่าสุดทั้ง ${teams.length} ทีม และบันทึกขึ้น Firebase เรียบร้อย`
    });
    if (activityLogs.length > 25) activityLogs = activityLogs.slice(0, 25);

    const payload = {
      updatedAt: new Date().toISOString(),
      leagueId: LEAGUE_ID,
      leagueName: leagueName,
      maxGW: maxGW,
      gwWinners: gwWinners,
      teams: teams,
      scores: scores,
      payments: payments,
      activityLogs: activityLogs
    };

    // 1. Write fpl_data.json
    fs.writeFileSync(JSON_FILE, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\n💾 [1/3] บันทึกข้อมูลลงไฟล์ ${path.basename(JSON_FILE)} สำเร็จ!`);

    // 2. Update index.html and pl.html if present
    HTML_FILES.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');

        const teamsRegex = /const initialTeams = \[([\s\S]*?)\];/;
        const scoresRegex = /const initialScores = \{([\s\S]*?)\};/;
        const winnersRegex = /let gwWinners = \{([\s\S]*?)\};/;

        html = html.replace(teamsRegex, `const initialTeams = ${JSON.stringify(teams, null, 2)};`);
        html = html.replace(scoresRegex, `const initialScores = ${JSON.stringify(scores, null, 2)};`);
        html = html.replace(winnersRegex, `let gwWinners = ${JSON.stringify(gwWinners, null, 2)};`);

        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`💾 [2/3] อัปเดตข้อมูลคะแนนสดลงใน ${path.basename(filePath)} เรียบร้อย!`);
      }
    });

    // 3. Push to Firebase Realtime Database
    const fbOk = await pushToFirebase(payload);
    if (fbOk) {
      console.log('🔥 [3/3] ซิงค์ขึ้น Firebase Realtime Database สำเร็จ! (มือถือทุกคนอัปเดตทันที)');
    } else {
      console.log('⚠️ [3/3] ข้ามการซิงค์ Firebase (ใช้ข้อมูลในเครื่องตามปกติ)');
    }

    console.log('\n====================================================');
    console.log('🏆 ตารางคะแนนล่าสุด (STANDINGS SUMMARY):');
    console.log('====================================================');
    const sorted = [...teams].sort((a, b) => {
      const totA = Object.values(scores[a.id] || {}).reduce((x, y) => x + y, 0);
      const totB = Object.values(scores[b.id] || {}).reduce((x, y) => x + y, 0);
      return totB - totA;
    });

    sorted.forEach((t, idx) => {
      const total = Object.values(scores[t.id] || {}).reduce((x, y) => x + y, 0);
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
      console.log(`${medal} #${(idx + 1).toString().padStart(2, ' ')}  ${t.name.padEnd(22, ' ')} | ผู้จัดการ: ${t.manager.padEnd(24, ' ')} | คะแนนรวม: ${total}`);
    });
    console.log('====================================================');
    console.log('✨ ซิงค์คะแนนเสร็จสมบูรณ์ 100%! สามารถเปิดดู index.html หรือ pl.html ได้ทันที\n');

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error.message);
  }
}

sync();
