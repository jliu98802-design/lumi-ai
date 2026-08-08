// ============================================================
// Lumi AI V35 — P2 Enhancements
// 1. 消息已送达动画（真实接入消息气泡）
// 2. 防沉迷日限（每日上限可配置，默认100条）
// 3. 数据导出 / 账号删除
// 4. 情绪报告引导增强（空状态加 CTA）
// 5. 省电模式（关闭 Canvas 粒子动画）
// ============================================================

(function(){
  'use strict';

  // ---- 工具 ----
  function $(id){return document.getElementById(id)}
  function getS(){return window.S||{}}

  const DAILY_LIMIT = 200; // 每日消息上限（用户+AI合计，仅统计用户发送）
  const DAILY_USER_LIMIT = 100; // 用户每日发送上限

  // ============================================================
  // 1. 已送达动画 — 接入每条用户消息
  // ============================================================
  // hook 原始 addMsg，给用户消息追加已读状态
  const origAddMsg = window.addMsg;
  if(typeof origAddMsg === 'function'){
    window.addMsg = function(role, text, time, opts){
      const result = origAddMsg.call(this, role, text, time, opts);
      // 仅用户消息加已送达标记
      if(role==='u'){
        setTimeout(()=>{
          const msgs = document.querySelectorAll('.msg.u');
          const last = msgs[msgs.length-1];
          if(last && !last.querySelector('.read-status')){
            const timeEl = last.querySelector('.msg-time');
            if(timeEl){
              const rs = createReadStatusV35();
              timeEl.appendChild(rs);
            }
          }
        }, 50);
      }
      return result;
    };
  }

  // hook renderConv — 历史消息也加已送达
  const origRenderConv = window.renderConv;
  if(typeof origRenderConv === 'function'){
    window.renderConv = function(){
      const result = origRenderConv.apply(this, arguments);
      setTimeout(()=>{
        document.querySelectorAll('.msg.u').forEach(m=>{
          const timeEl = m.querySelector('.msg-time');
          if(timeEl && !timeEl.querySelector('.read-status')){
            const rs = createReadStatusV35(true);
            timeEl.appendChild(rs);
          }
        });
      }, 100);
      return result;
    };
  }

  function createReadStatusV35(done){
    const span = document.createElement('span');
    span.className = 'read-status';
    span.innerHTML = '<span class="rs-tick">✓</span>';
    if(done){
      span.innerHTML = '<span class="rs-tick">✓✓</span>';
    } else {
      setTimeout(()=>{
        span.innerHTML = '<span class="rs-tick">✓✓</span>';
      }, 1200);
    }
    return span;
  }

  // ============================================================
  // 2. 防沉迷 — 每日消息上限 + 柔和提醒
  // ============================================================
  // hook sendMsg — 每次发送前检查日限
  const origSendMsg = window.sendMsg;
  if(typeof origSendMsg === 'function'){
    window.sendMsg = function(text){
      const daily = getDailyCount();
      if(daily >= DAILY_USER_LIMIT){
        showLimitToast();
        return;
      }
      // 接近上限时提醒
      if(daily === DAILY_USER_LIMIT - 10){
        showToast('💡 今天已经聊了90条啦，注意休息哦 🌙');
      }
      return origSendMsg.call(this, text);
    };
  }

  function getDailyCount(){
    const today = new Date().toDateString();
    if(localStorage.getItem('lumi_daily_date') !== today){
      localStorage.setItem('lumi_daily_date', today);
      localStorage.setItem('lumi_daily_msgs', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('lumi_daily_msgs')||'0');
  }

  function showLimitToast(){
    const t = document.createElement('div');
    t.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:rgba(15,15,30,.95);backdrop-filter:blur(20px);color:#FAF8F5;padding:28px 32px;border-radius:20px;text-align:center;max-width:280px;border:1px solid rgba(196,162,101,.2);animation:popIn .3s ease';
    t.innerHTML = '<div style="font-size:40px;margin-bottom:12px">🌙</div>'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:8px">今天聊够啦</div>'
      + '<div style="font-size:13px;color:rgba(250,248,245,.6);line-height:1.6;margin-bottom:20px">你今天已经发了 '+DAILY_USER_LIMIT+' 条消息啦<br>放下手机，早点休息吧<br>明天我还在这里等你 ✨</div>'
      + '<button id="v35LimitClose" style="padding:10px 32px;border:none;border-radius:20px;background:linear-gradient(135deg,#D4956A,#C4A265);color:#fff;font-size:14px;font-weight:600;cursor:pointer">好的，晚安</button>';
    document.body.appendChild(t);
    t.querySelector('#v35LimitClose').onclick=()=>t.remove();
  }

  // ============================================================
  // 3. 数据导出 / 账号删除
  // ============================================================
  // 在设置页面追加"数据管理"区块
  function injectDataManagement(){
    const settingsBody = $('settingsBody') || $('settingsContent');
    if(!settingsBody) return;
    if(document.getElementById('v35DataMgmt')) return;

    const section = document.createElement('div');
    section.id = 'v35DataMgmt';
    section.className = 'settings-section';
    section.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(250,248,245,.08)';
    section.innerHTML = `
      <div class="settings-title" style="font-size:11px;color:rgba(250,248,245,.3);letter-spacing:1px;margin-bottom:10px;padding:0 4px">数据管理</div>
      <div class="settings-row" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(250,248,245,.04);border-radius:12px;margin-bottom:8px;cursor:pointer" id="v35ExportBtn">
        <span style="font-size:14px;color:var(--text-primary)">📤 导出我的数据</span>
        <span style="font-size:12px;color:var(--text-secondary)">JSON</span>
      </div>
      <div class="settings-row" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(231,76,60,.08);border-radius:12px;cursor:pointer" id="v35DeleteBtn">
        <span style="font-size:14px;color:#e74c3c">🗑️ 删除我的数据</span>
        <span style="font-size:12px;color:rgba(231,76,60,.6)">不可恢复</span>
      </div>
    `;
    settingsBody.appendChild(section);

    $('v35ExportBtn').onclick = exportAllData;
    $('v35DeleteBtn').onclick = showDeleteConfirm;
  }

  function exportAllData(){
    const data = {
      exportedAt: new Date().toISOString(),
      app: 'Lumi AI',
      version: (window.SERVER_VERSION||'unknown'),
      profile: safeParse(localStorage.getItem('lumi_profile')||'{}'),
      emotionHistory: safeParse(localStorage.getItem('lumi_emo_history')||'[]'),
      emotionSeeds: safeParse(localStorage.getItem('lumi_emo_seeds')||'[]'),
      memoryCards: safeParse(localStorage.getItem('lumi_mem_cards')||'[]'),
      diaryEntries: safeParse(localStorage.getItem('lumi_diary')||'[]'),
      chatHistory: safeParse(localStorage.getItem('lumi_conv_lumi')||'[]'),
      settings: {
        sfx: localStorage.getItem('lumi_sfx'),
        bgm: localStorage.getItem('lumi_bgm'),
        tts: localStorage.getItem('lumi_tts'),
        vibrate: localStorage.getItem('lumi_vibrate'),
        dark: localStorage.getItem('lumi_dark'),
        bgm_volume: localStorage.getItem('lumi_bgm_volume'),
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumi-data-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ 数据已导出');
  }

  function showDeleteConfirm(){
    const t = document.createElement('div');
    t.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:24px';
    t.innerHTML = `<div style="background:#1a1a2e;border-radius:16px;padding:28px 24px;max-width:320px;width:100%;border:1px solid rgba(231,76,60,.2)">
      <div style="font-size:32px;text-align:center;margin-bottom:12px">⚠️</div>
      <div style="font-size:17px;font-weight:600;color:#FAF8F5;text-align:center;margin-bottom:8px">确定要删除所有数据吗？</div>
      <div style="font-size:13px;color:rgba(250,248,245,.5);line-height:1.6;text-align:center;margin-bottom:20px">
        这将清除你在本设备上的所有聊天记录、日记、情绪数据和偏好设置。<br><b style="color:#e74c3c">此操作不可恢复。</b>
      </div>
      <div style="display:flex;gap:10px">
        <button id="v35DelCancel" style="flex:1;padding:12px;border:none;border-radius:20px;background:rgba(250,248,245,.08);color:rgba(250,248,245,.6);font-size:14px;cursor:pointer">取消</button>
        <button id="v35DelConfirm" style="flex:1;padding:12px;border:none;border-radius:20px;background:#e74c3c;color:#fff;font-size:14px;font-weight:600;cursor:pointer">确认删除</button>
      </div>
    </div>`;
    document.body.appendChild(t);
    t.querySelector('#v35DelCancel').onclick=()=>t.remove();
    t.querySelector('#v35DelConfirm').onclick=()=>{
      doDeleteAll();
      t.remove();
    };
  }

  function doDeleteAll(){
    // 保留必要设置键，清除用户数据
    const keepKeys = ['lumi_token','lumi_username','lumi_api_base','lumi_api_key','lumi_model','lumi_sfx','lumi_bgm','lumi_tts','lumi_vibrate','lumi_dark','lumi_bgm_volume','lumi_age_verified','lumi_onboarded'];
    const keysToRemove = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('lumi_') && !keepKeys.includes(k)){
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k=>localStorage.removeItem(k));
    // 重置 profile
    localStorage.setItem('lumi_profile', JSON.stringify({nickname:''}));
    showToast('🗑️ 数据已全部清除');
    setTimeout(()=>location.reload(), 1000);
  }

  function safeParse(s){try{return JSON.parse(s)}catch(e){return null}}

  // ============================================================
  // 4. 情绪报告引导增强
  // ============================================================
  const origGenReport = window.generateReport;
  if(typeof origGenReport === 'function'){
    window.generateReport = function(){
      const result = origGenReport.apply(this, arguments);
      const chart = $('reportChart');
      if(!chart) return result;
      // 如果是空状态，加 CTA 按钮
      const emptyEl = chart.querySelector('div[style*="text-align:center"]');
      if(emptyEl && emptyEl.textContent.includes('还没有情绪记录')){
        emptyEl.innerHTML = '<div style="font-size:36px;margin-bottom:8px">📊</div>'
          + '<div style="font-size:14px;color:var(--text-sec);line-height:1.6;margin-bottom:16px">还没有情绪记录哦<br>去首页打个卡，生成你的第一份报告吧</div>'
          + '<button onclick="window.togglePage&&window.togglePage(0)" style="padding:10px 24px;border:none;border-radius:20px;background:linear-gradient(135deg,#D4956A,#C4A265);color:#fff;font-size:13px;font-weight:600;cursor:pointer">去打卡 →</button>';
      }
      return result;
    };
  }

  // ============================================================
  // 5. 省电模式 — 关闭 Canvas 粒子动画
  // ============================================================
  function injectPowerSavingToggle(){
    const settingsBody = $('settingsBody') || $('settingsContent');
    if(!settingsBody) return;
    if(document.getElementById('v35PowerSaving')) return;

    const section = document.createElement('div');
    section.id = 'v35PowerSaving';
    section.innerHTML = `
      <div class="settings-row" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(250,248,245,.04);border-radius:12px;margin-bottom:8px">
        <span style="font-size:14px;color:var(--text-primary)">🔋 省电模式</span>
        <label style="position:relative;display:inline-block;width:44px;height:24px">
          <input type="checkbox" id="v35PowerSaveToggle" style="opacity:0;width:0;height:0">
          <span style="position:absolute;cursor:pointer;inset:0;background:rgba(250,248,245,.15);border-radius:24px;transition:.3s"></span>
          <span id="v35PowerSaveKnob" style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.3s"></span>
        </label>
      </div>
    `;
    const insertBefore = document.getElementById('v35DataMgmt');
    if(insertBefore){
      settingsBody.insertBefore(section, insertBefore);
    } else {
      settingsBody.appendChild(section);
    }

    const toggle = $('v35PowerSaveToggle');
    const knob = $('v35PowerSaveKnob');
    const track = knob.previousElementSibling;
    const enabled = localStorage.getItem('lumi_power_save')==='true';
    if(enabled){
      toggle.checked = true;
      track.style.background = '#D4956A';
      knob.style.transform = 'translateX(20px)';
    }

    toggle.onchange = function(){
      const on = toggle.checked;
      localStorage.setItem('lumi_power_save', on?'true':'false');
      track.style.background = on ? '#D4956A' : 'rgba(250,248,245,.15)';
      knob.style.transform = on ? 'translateX(20px)' : '';
      applyPowerSaving(on);
      showToast(on?'🔋 省电模式已开启':'⚡ 省电模式已关闭');
    };
  }

  function applyPowerSaving(on){
    const canvas = $('homeCanvas');
    const chatCanvas = $('chatAurora');
    if(on){
      if(canvas) canvas.style.display = 'none';
      if(chatCanvas) chatCanvas.style.display = 'none';
      // 停止天气粒子
      if(window.WeatherParticles && window.WeatherParticles.stop){
        window.WeatherParticles.stop();
      }
    } else {
      if(canvas) canvas.style.display = '';
      if(chatCanvas) chatCanvas.style.display = '';
      if(window.WeatherParticles && window.WeatherParticles.start){
        window.WeatherParticles.start();
      }
    }
  }

  // 启动时应用省电模式
  function initPowerSaving(){
    if(localStorage.getItem('lumi_power_save')==='true'){
      setTimeout(()=>applyPowerSaving(true), 500);
    }
  }

  // ============================================================
  // 注入时机
  // ============================================================
  function bootV35(){
    // 设置面板注入（设置面板打开时注入）
    const origOpenSettings = window.openSettings;
    if(typeof origOpenSettings === 'function'){
      window.openSettings = function(){
        const r = origOpenSettings.apply(this, arguments);
        setTimeout(()=>{
          injectDataManagement();
          injectPowerSavingToggle();
        }, 50);
        return r;
      };
    }

    initPowerSaving();

    console.log('[Lumi V35] P2 enhancements loaded ✓');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootV35);
  } else {
    bootV35();
  }

})();
