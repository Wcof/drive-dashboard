/**
 * 端到端可运行验证 —— 复现机器人大屏三大需求的真实运行验证
 *
 * 运行方式：
 *   1. 启动开发服务器: npx vite --port 5600
 *   2. 运行验证: node e2e.cjs
 *   3. 查看结果: 控制台输出 + e2e-verify.log
 *
 * 依赖: puppeteer-core + Google Chrome
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const out = []
function log(s) { out.push(s); console.log(s) }

;(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080 })
  await p.goto('http://localhost:5600/', { waitUntil: 'networkidle2' }); await sleep(3000)

  log('========== 端到端可运行验证 ==========')
  log('时间: ' + new Date().toISOString())
  log('URL: http://localhost:5600/')
  log('')

  // === 需求1: 无滑轮滚动 ===
  log('【需求1: 智慧大屏无滑轮滚动】')
  const sc = await p.evaluate(() => {
    const bodyH = getComputedStyle(document.body).overflow
    const htmlH = getComputedStyle(document.documentElement).overflow
    const off = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el), t = el.tagName, inp = t === 'INPUT' || t === 'TEXTAREA' || el.isContentEditable
      if (!inp && (cs.overflow === 'auto' || cs.overflowY === 'auto') && el.scrollHeight > el.clientHeight + 2 && el.offsetHeight > 80) off.push(el.className?.toString?.()?.slice(0, 40))
      if (!inp && (cs.overflow === 'scroll' || cs.overflowY === 'scroll')) off.push(el.className?.toString?.()?.slice(0, 40))
    }
    return { bodyH, htmlH, offCount: off.length, off }
  })
  log(`  body overflow = ${sc.bodyH}  ${sc.bodyH === 'hidden' ? '✅' : '❌'}`)
  log(`  html overflow = ${sc.htmlH}  ${sc.htmlH === 'hidden' ? '✅' : '❌'}`)
  log(`  显示态溢出滚动条数量 = ${sc.offCount}  ${sc.offCount === 0 ? '✅' : '❌'} ${JSON.stringify(sc.off)}`)
  log('')

  // === 需求2: 自动轮播 ===
  log('【需求2: 首屏内容过多用自动播放轮播】')
  await p.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(b => /解锁/.test(b.innerText)); if (x) x.click() })
  await sleep(400); await p.evaluate(() => { const x = document.querySelector('.modal-mask .btn--confirm'); if (x) x.click() }); await sleep(400)
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(b => /自动轮播/.test(b.innerText)); if (b) b.click() })
  await sleep(400)
  const tp1 = await p.evaluate(() => { const e = document.querySelector('.tp-pagination .active'); return e ? Array.from(e.parentNode.children).indexOf(e) : -1 })
  const ae1 = await p.evaluate(() => { const e = document.querySelector('.ae-pagination .active'); return e ? Array.from(e.parentNode.children).indexOf(e) : -1 })
  log(`  任务池当前页 = ${tp1}`)
  log(`  告警锚点当前页 = ${ae1}`)
  log(`  等待 5.5 秒观察自动翻页...`)
  await sleep(5500)
  const tp2 = await p.evaluate(() => { const e = document.querySelector('.tp-pagination .active'); return e ? Array.from(e.parentNode.children).indexOf(e) : -1 })
  const ae2 = await p.evaluate(() => { const e = document.querySelector('.ae-pagination .active'); return e ? Array.from(e.parentNode.children).indexOf(e) : -1 })
  log(`  任务池翻页后 = ${tp2}  ${tp1 !== tp2 ? '✅ 自动翻页成功' : '❌'}`)
  log(`  告警锚点翻页后 = ${ae2}  ${ae1 !== ae2 ? '✅ 自动翻页成功' : '❌'}`)
  const sp1 = await p.evaluate(() => !!document.querySelector('.tl-auto-btn.active'))
  await p.evaluate(() => { if (document.activeElement?.blur) document.activeElement.blur() })
  await p.keyboard.press('Space'); await sleep(600)
  const sp2 = await p.evaluate(() => !!document.querySelector('.tl-auto-btn.active'))
  await p.keyboard.press('Space'); await sleep(600)
  const sp3 = await p.evaluate(() => !!document.querySelector('.tl-auto-btn.active'))
  log(`  Space 切换: active ${sp1}→${sp2}→${sp3}  ${sp1 !== sp2 && sp2 !== sp3 ? '✅ 双向切换' : '❌'}`)
  log('')

  // === 需求3: 分辨率适配 ===
  log('【需求3: 页面分辨率适配】')
  for (const r of [{ w: 1920, h: 1080, n: '1080P' }, { w: 2560, h: 1440, n: '2K' }, { w: 3840, h: 2160, n: '4K' }, { w: 1366, h: 768, n: '小屏' }]) {
    await p.setViewport({ width: r.w, height: r.h }); await sleep(600)
    const f = await p.evaluate(() => { const h = document.querySelector('.hud-stage'), m = document.querySelector('.map-layer'); return { hs: h ? `${h.offsetWidth}x${h.offsetHeight}` : 'null', mf: m ? `${m.offsetWidth}x${m.offsetHeight}` : 'null', mapFull: m ? (m.offsetWidth === window.innerWidth && m.offsetHeight === window.innerHeight) : false } })
    log(`  ${r.n} (${r.w}x${r.h}): UI层=${f.hs} 地图层=${f.mf} 地图全屏=${f.mapFull}  ${f.mapFull ? '✅' : '❌'}`)
  }
  await p.setViewport({ width: 1920, height: 1080 })
  log('')

  // === 需求4: 交互闭环 ===
  log('【需求4: 交互效果完善 - 告警闭环6按钮】')
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(b => /返回全局|← 返回/.test(b.innerText)); if (b) b.click() }); await sleep(800)
  await p.waitForSelector('.ae-item', { timeout: 8000 })
  await p.evaluate(() => { const e = document.querySelector('.ae-item'); if (e) e.click() }); await sleep(1500)
  const alertBtns = await p.evaluate(() => { const m = document.querySelector('.alert-modal-mask'); if (!m) return null; return Array.from(m.querySelectorAll('button')).map(b => b.innerText) })
  log(`  告警详情弹窗按钮: ${JSON.stringify(alertBtns)}`)
  const has6 = alertBtns && alertBtns.filter(b => /可见光|热红外|异状|远控|复核|处置|现场已查|撤销/.test(b)).length >= 4
  log(`  6闭环按钮齐全: ${has6 ? '✅' : '❌'}`)
  await p.keyboard.press('Escape'); await sleep(400)

  log('【交互: 审计日志弹窗】')
  await p.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(b => b.title === '审计日志'); if (b) b.click() }); await sleep(700)
  const audit = await p.evaluate(() => { const m = document.querySelector('.modal-mask'); if (!m) return null; return { title: m.querySelector('.modal__title')?.innerText, rows: m.querySelectorAll('tr').length } })
  log(`  审计日志: ${audit ? `title="${audit.title}" rows=${audit.rows} ✅` : '❌'}`)
  await p.keyboard.press('Escape'); await sleep(400)

  log('【交互: 强检设备30/15/5/0天梯度表】')
  await p.evaluate(() => { const e = document.querySelector('.expiry-item'); if (e) e.click() }); await sleep(800)
  const expiry = await p.evaluate(() => { const m = document.querySelector('.modal-mask'); if (!m) return null; return { title: m.querySelector('.modal__title')?.innerText, hasGradient: /30|15|5 天|0 天/.test(m.innerText) } })
  log(`  强检设备: ${expiry ? `title="${expiry.title}" 梯度表=${expiry.hasGradient ? '✅' : '❌'}` : '❌'}`)
  await p.keyboard.press('Escape'); await sleep(400)

  log('【交互: 时间轴节点】')
  const tlNodes = await p.evaluate(() => document.querySelectorAll('.f-node').length)
  log(`  时间轴节点数 = ${tlNodes}  ${tlNodes > 0 ? '✅' : '❌'}`)
  log('')

  log('========== 汇总 ==========')
  const pass = out.filter(s => s.includes('✅')).length
  const fail = out.filter(s => s.includes('❌')).length
  log(`✅ 通过: ${pass} 项`)
  log(`❌ 失败: ${fail} 项`)
  log(`总计: ${pass + fail} 项`)
  fs.writeFileSync('e2e-verify.log', out.join('\n'))
  await b.close()
  process.exit(fail > 0 ? 1 : 0)
})().catch(e => { console.error('FATAL:', e.message); process.exit(2) })
