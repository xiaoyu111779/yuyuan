/*!
// 独立小手机脚本(芋圆机) v233 - 在 v231 基础上新增:char 小号马甲私信(从主线一键导入 + 伪装回复 + 揭穿);私信里的心声也支持双击删除;马甲小号可潜入粉丝群(桥接潜伏);微信和小红书的 char 对话都支持从主线导入 ta 发的消息,开了剧情时间会按剧情时间自动插入排序;新增【多人卡·出场角色花名册】Phase1(从角色卡识别角色 + 每角色独立微信对话/人设/真名同步;花名册为空时单 char 行为不变)。v239:花名册角色微信对话补表情包支持,并兜底把误写成 [sticker:描述] 的占位转成真表情/丢弃;补回主 char 微信&小红书私信丢失的表情包提示(本该有,json.sticker 处理一直在)。v241:多人卡(花名册非空)时不再自动建/显示卡名 {{char}}(微信会话列表 + 小红书消息置顶都屏蔽),避免卡名当假角色冒出来。v242:热梗/表情包/禁词/全局提示词/活人感改为真·全局(跨对话跨卡共享,首次保存自动迁移当前对话的值)。v243:补上微信群 NPC 好友的表情包(提示+解析),至此私聊/群聊/小红书各路表情包都齐了。v244:多人卡 Phase2-小红书私信(每个出场角色一个独立小红书私信,各用各人设/真名同步;cast 回复与同步按渠道区分微信/小红书)。v245:转发选择列表里花名册角色标为"出场角色"(原来误标陌生人私信/微信好友)。v246:多人卡 Phase2b-每个出场角色拥有完整小红书账号(主页 renderCastProfile + 发帖 genCastPost + 补历史动态 seedCastPosts + 签名 genCastBio + 关注/私信入口 + 点名进主页 + 头像映射),和单 char 同套。v247:角色小红书主页可直接编辑——点头像换头像、🎨 改主页背景(新增 cast.profileBg)。原 v231: - 修帖子详情页顶栏帖主名字被关注/删除按钮挤到换行:.xhs-view-author 加 min-width:0(可收缩),.xhs-view-author-name 加 overflow:hidden+text-overflow:ellipsis+white-space:nowrap(名字占满可用宽度、超长省略号、不换行),.xhs-view-avatar 加 flex-shrink:0,右侧关注/删除按钮组加 flex-shrink:0(固定不收缩、不把名字挤到第二行)。
 * 触发: /yuyuan 打开小红书
 * 功能: 刷帖子、发帖、粉丝群创建+群聊、同步主对话
 * 基于 SillyTavern JS-Slash-Runner
 */
(function () {
  'use strict';

  // ============ 数据 ============
  const STORE_KEY = 'xhs_data_v1';
  // 外观字段:全局共享(换对话不变);其余数据各对话各存
  const APPEARANCE_KEYS = ['homeBg', 'homeText', 'appIcons', 'charmImg', 'charmImg2', 'charmOff', 'bubbleMe', 'bubbleOther', 'charPhoneIcons', 'charPhoneAppIcon', 'charPhoneBg', 'charPhoneLockBg', 'charPhoneTextColor'];
  const GLOBAL_APPEARANCE_KEY = 'xhs_appearance_v1';
  const GLOBAL_PREFS_KEY = 'xhs_global_prefs_v1';
  // 全局共享(跨对话跨卡):热梗/表情包/禁词/全局附加提示词/整体聊天风格(活人感)
  const GLOBAL_PREFS_KEYS = ['memes', 'stickers', 'banWords', 'extraPrompt', 'chatStyle'];
  // ====== 默认外观(发给别人时,新用户首次打开就是这套;他们仍可自行修改) ======
  // 用设置里的"📋 导出当前外观为默认"按钮生成,把内容贴回这里即可。
  const THEME_DEFAULTS = {
    homeBg: 'center/cover no-repeat url("https://img.cdn1.vip/i/6a21dbc094091_1780603840.webp")',
    homeText: '#1a0f0f',
    appIcons: {
      xhs: 'https://img.cdn1.vip/i/6a21df99d8dd2_1780604825.webp',
      wx: 'https://img.cdn1.vip/i/6a21e89e2fda4_1780607134.jpg',
      set: 'https://img.cdn1.vip/i/6a21ea6f79d17_1780607599.jpg',
    },
    charmImg: 'https://img.cdn1.vip/i/6a21f2d04fb6d_1780609744.webp',
    charmImg2: 'https://img.cdn1.vip/i/6a21ed9291640_1780608402.webp',
    bubbleMe: '#fbdaef',
    bubbleOther: '#ffffff',
    charPhoneIcons: { wx: 'https://img.cdn1.vip/i/6a2aae4e1fd9d_1781182030.webp', notes: 'https://img.cdn1.vip/i/6a2aae57bc624_1781182039.webp', safari: 'https://img.cdn1.vip/i/6a2ab01033f2e_1781182480.webp', music: 'https://img.cdn1.vip/i/6a2aae68bf3da_1781182056.webp', taobao: 'https://img.cdn1.vip/i/6a2aae86e1cc3_1781182086.webp', alipay: 'https://img.cdn1.vip/i/6a2aae8698d3b_1781182086.webp', doubao: 'https://img.cdn1.vip/i/6a2ab151cbd1a_1781182801.jpg', poop: 'https://img.cdn1.vip/i/6a2ab13f8310e_1781182783.webp' },
    charPhoneAppIcon: 'https://img.cdn1.vip/i/6a2ab23784bf3_1781183031.jpg',
    charPhoneBg: 'https://img.cdn1.vip/i/6a2ab1d51dc48_1781182933.webp',
    charPhoneLockBg: '',
    charPhoneTextColor: 'dark',
  };
  const DEFAULT_DATA = {
    api: { useMainApi: true, proxy_preset: '', apiurl: '', key: '', model: '', source: '', temperature: 0.8 },
    syncToMain: true,
    syncHidden: false,
    useStoryTime: false,    // 时间按剧情走(帖子/评论/微信/群聊显示剧情时间;主界面时钟仍现实时间)
    storyTimeManual: '',    // 手动指定的当前剧情时间(优先级最高)
    storyTimeAuto: '',      // 每次生成时从剧情上下文自动读到的时间(缓存)
    contextMessages: 30,
    memes: '',                // 热梗素材
    xhsNpcStyle: '',          // 小红书路人NPC专属风格/语录(发疯/抽象/阴阳怪气);只小红书路人,不沾char/微信
    platformTone: '',         // 平台基调/世界观(用户自定义,影响帖子/评论语气)
    feedPrefs: '',            // 首页内容偏好(整体题材/氛围)
    ficPrefs: '',             // 同人文偏好(CP/题材/tag)
    ficMemes: '',             // 同人文梗/桥段池(用户自己放,轮着用,减少雷同)
    ficMemesUsed: [],         // 最近几轮已用过的梗(避重:优先抽没用过的,一轮用完再重置)
    ficFormats: ['prose', 'chat'], // 同人文体裁(可多选):prose/letter/diary/qa100/chat
    banWords: '',             // 禁词/禁句
    styleRef: '',             // 文风偏好
    bossKiller: false,        // 霸总粉碎:一键禁用霸总言情套话
    ficRatio: 3,              // 10 条里大约几条同人文
    ficWordMin: 600,          // 同人文专区每篇字数下限(默认拉高,保证能展开)
    ficWordMax: 1000,         // 同人文专区每篇字数上限
    ficChars: 'random',       // 同人文主角来源 random|specify|uchar|worldbook
    likedSignals: [],         // 最近点赞帖子的口味信号(喂推荐)
    charName: '',             // char 在小红书的账号名(空=自动取主对话里的char)
    charSeesPosts: true,      // char 能不能刷到 user 的帖子
    charKnowsAlt: 'unknown',  // char 是否知道这账号是 user 的:knows|unknown
    charSuspicion: 0,         // 累计怀疑度 0-100(证据累计)
    charClues: [],            // char 注意到的"重合线索"清单
    suspSensitivity: 'slow',  // 证据加分速度 slow|normal|fast
    suspAutoReveal: false,    // 怀疑度满100时是否自动识破
    charAvatar: '',           // char 主页头像 URL
    charProfileBg: '',        // char 主页背景 URL/颜色
    charBio: '',              // char 的小红书签名
    charPostsSeeded: false,   // 是否已生成过 char 的历史动态
    charLurk: false,          // char 潜伏模式:偷偷潜进 user 的粉丝群暗中看着,user 不知道
    charLurkAlias: '',        // char 潜伏时用的马甲名
    lurkThoughts: false,      // 偷听 char 心声(上帝视角,只有 user 看得到,不进主线)
    stickers: [],             // 自定义表情包 [{name, url}]
    storySummary: null,
    storySummaryAt: null,
    charBinding: null,
    charXhsPersona: '',      // char 在小红书上的语言风格/打字习惯(留空=按人设默认)
    extraPrompt: '',         // 全局附加提示词(我的风格规则):加到每次生成最前;路人评论NPC除外
    chatStyle: '',           // 整体聊天风格(活人感):只注入聊天类生成(私信/群聊),不碰发帖评论
    userName: '我',
    userAvatar: '',          // 头像图片 URL
    userBio: '乱七八糟碎碎念',
    userRedId: 'A1234',
    userGender: '',          // 性别:女/男/保密(给评论区识别楼主)
    userIp: '英国',          // 归属地,可改
    profileBg: '',           // 主页背景: 颜色值或图片 URL
    avatarBg: '',            // 没传头像URL时的头像底色
    followCount: 0,          // (显示用,自动 = following.length)
    fansCount: 0,            // 粉丝数
    following: [],           // 我关注的人 [{name, bio, ip, at}]
    npcProfiles: {},         // 别人主页缓存 { name: {bio, redId, ip, fans, posts:[], at} }
    currentApp: 'home',       // home(桌面) | xhs(小红书) | wx(微信) | set(设置)
    homeBg: THEME_DEFAULTS.homeBg || '',               // 手机主页背景(CSS background 值,空=默认渐变)
    homeText: THEME_DEFAULTS.homeText || '#ffffff',      // 主页文字颜色(时间/日期/图标名)
    charmImg: THEME_DEFAULTS.charmImg || '',             // 手机挂件图片 URL(空=默认小挂坠)
    charmOff: false,          // 关闭挂件
    charmImg2: THEME_DEFAULTS.charmImg2 || '',            // 第二个挂件(斜着飘到外面那条)图片 URL
    appIcons: Object.assign({}, THEME_DEFAULTS.appIcons), // 自定义 App 图标 {xhs,wx,set} = 图片URL
    bubbleMe: THEME_DEFAULTS.bubbleMe || '',             // 我的气泡颜色(空=默认绿)
    bubbleOther: THEME_DEFAULTS.bubbleOther || '',       // 对方气泡颜色(空=默认白)
    wxName: '',               // 微信昵称(空=用小红书昵称)
    wxAvatar: '',             // 微信头像 URL
    wxBio: '',                // 微信个性签名
    cast: [],                 // 多人卡出场角色花名册:[{id,name,persona,avatar}];空=单 char 行为不变
    currentRoute: 'feed',
    routeContext: {},
    feed: [],
    charPhone: null,        // 偷看 char 手机:{ genAt, wx:[], notes:[], safari:[] }(单人卡)
    charPhoneBg: '',        // char 手机主屏背景(留空→走全局/THEME_DEFAULTS)
    charPhoneLockBg: '',    // char 手机锁屏背景
    charPhoneTextColor: '', // 桌面/锁屏字体色:light/dark(留空→走 THEME_DEFAULTS)
    charPhoneIcons: {},     // char 手机 app 自定义图标(留空→走 THEME_DEFAULTS)
    charPhoneAppIcon: '',   // 桌面「ta 的手机」图标(留空→走 THEME_DEFAULTS)
    charPhoneMusic: null,   // ta 的网易云:{ genAt, songs:[] }
    charPhoneTaobao: null,  // ta 的淘宝:{ genAt, vip, saved, counts, cart:[], orders:[] }
    charPhoneAlipay: null,  // ta 的支付宝:{ genAt, balance, yuebao, banks:[], bills:[] }
    charPhoneDoubao: null,  // ta 的豆包:{ genAt, msgs:[{from,text}] }
    charPhonePoop: null,    // ta 的拉屎打卡:{ genAt, streak, todayPooped, tip, records:[] }
    ficFeed: [],            // 同人文专区的帖子(替换式,每次刷新换一批)
    feedCat: 'rec',         // 发现页当前分类:rec 推荐 / fic 同人文
    feedFetchTime: 0,
    myPosts: [],
    groups: [], // {id, name, members:[{name, persona, avatar}], chat:[{role, name, text, time}]}
    dms: [],    // 陌生人私信 {id, name, persona, fromPostId, messages:[{role:'npc'|'me', text, time}], lastTime, unread}
    notifs: [], // "评论和@"通知:别人回复了 user 的评论/评论了 user 的帖子
  };

  function loadData() {
    let d;
    try {
      const v = (typeof getVariables === 'function')
        ? getVariables({ type: 'chat' })[STORE_KEY]
        : null;
      d = v ? Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), v) : JSON.parse(JSON.stringify(DEFAULT_DATA));
    } catch (e) {
      d = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    // 外观全局共享:用全局保存的外观覆盖;没设过就用 THEME_DEFAULTS(忽略各对话里可能残留的旧外观)
    let ga = null;
    try { if (typeof getVariables === 'function') ga = getVariables({ type: 'global' })[GLOBAL_APPEARANCE_KEY] || null; } catch (e) {}
    APPEARANCE_KEYS.forEach(k => {
      if (ga && ga[k] !== undefined) {
        d[k] = (k === 'appIcons' || k === 'charPhoneIcons') ? Object.assign({}, ga[k] || {}) : ga[k];
      } else {
        // 全局没存(或全局变量在本环境不可用)→ 优先保留本对话已存的外观,实在没有才用默认
        const hasLocal = (k === 'appIcons' || k === 'charPhoneIcons')
          ? (d[k] && Object.values(d[k]).some(v => v))
          : (d[k] !== undefined && d[k] !== '');
        if (!hasLocal && THEME_DEFAULTS[k] !== undefined) {
          d[k] = (k === 'appIcons' || k === 'charPhoneIcons') ? Object.assign({}, THEME_DEFAULTS[k]) : THEME_DEFAULTS[k];
        }
      }
    });
    // 偏好全局共享:热梗/表情/禁词/全局提示词/活人感(跨对话跨卡);全局没设过则保留当前对话已有值(下次 save 自动迁移到全局)
    let gp = null;
    try { if (typeof getVariables === 'function') gp = getVariables({ type: 'global' })[GLOBAL_PREFS_KEY] || null; } catch (e) {}
    if (gp) GLOBAL_PREFS_KEYS.forEach(k => { if (gp[k] !== undefined) d[k] = gp[k]; });
    return d;
  }
  async function saveData(d) {
    try {
      if (typeof replaceVariables === 'function') {
        // 内容/设置 → 当前对话
        const all = (typeof getVariables === 'function') ? (getVariables({ type: 'chat' }) || {}) : {};
        all[STORE_KEY] = d;
        await replaceVariables(all, { type: 'chat' });
        // 外观 → 全局(所有对话共享,换对话不变)
        try {
          const ap = {};
          APPEARANCE_KEYS.forEach(k => { ap[k] = d[k]; });
          const g = (typeof getVariables === 'function') ? (getVariables({ type: 'global' }) || {}) : {};
          g[GLOBAL_APPEARANCE_KEY] = ap;
          const pp = {};
          GLOBAL_PREFS_KEYS.forEach(k => { pp[k] = d[k]; });
          g[GLOBAL_PREFS_KEY] = pp;
          await replaceVariables(g, { type: 'global' });
        } catch (e2) { console.warn('[XHS] global appearance save failed', e2); }
      }
    } catch (e) { console.warn('[XHS] save failed', e); }
  }

  // ====== 剧情时间 ======
  function effStoryTime(d) {
    const m = (d && d.storyTimeManual || '').trim();
    if (m) return m;
    return (d && d.storyTimeAuto || '').trim();
  }
  // 某条内容(帖子/评论/消息)显示的时间:开了剧情时间→优先它存的剧情戳,其次当前剧情时间,都没有才现实日期
  function stTimeLabel(d, item) {
    if (d && d.useStoryTime) {
      const st = item && item.st ? String(item.st).trim() : '';
      if (st) return st;
      const eff = effStoryTime(d);
      if (eff) return eff;
    }
    const t = item && item.time;
    return t ? new Date(t).toLocaleDateString() : '';
  }
  // 新建内容时打的剧情时间戳(关了功能就空)
  function stStamp(d) { return (d && d.useStoryTime) ? effStoryTime(d) : ''; }
  // 生成完成后:还停在相关页面→刷新展示;已经切到别的界面→不刷新(不打断/不跳转),只弹个提示
  function refreshOnView(check, notify) {
    let on = true;
    try { on = !!check(loadData()); } catch (e) { on = true; }
    if (on) refreshXhs();
    else if (notify) { try { toastr.success(notify); } catch (e) {} }
  }
  // 消息列表用:开了剧情时间就显示剧情时间,否则相对时间(刚刚/昨天…)
  function fmtTimeOrStory(d, ts) {
    if (d && d.useStoryTime) { const e = effStoryTime(d); if (e) return e; }
    return fmtTime(ts);
  }
  // 会话列表的时间:开了剧情时间→优先最后一条消息存的剧情戳,其次当前剧情时间,否则相对时间
  // 列表里把长剧情时间压成短标签(详情页里仍显示完整 st)
  function shortStoryLbl(s) {
    s = String(s || '').trim();
    if (!s) return '';
    let m = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
    if (m) return `${m[1]}月${m[2]}日`;
    m = s.match(/第\s*[一二三四五六七八九十两\d]+\s*天/);
    if (m) return m[0].replace(/\s/g, '');
    m = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
    m = s.match(/清晨|早上|早晨|上午|中午|下午|傍晚|晚上|深夜|凌晨|夜里|周[一二三四五六日天]/);
    if (m) return m[0];
    return s.length > 6 ? s.slice(0, 6) + '…' : s;
  }
  function chatListTimeLbl(d, st, ts) {
    if (d && d.useStoryTime) { if (st) return shortStoryLbl(st); const e = effStoryTime(d); if (e) return shortStoryLbl(e); }
    return fmtTime(ts);
  }
  // 聊天里:当某条消息的剧情时间和上一条不同,在它上面插一条居中时间(微信风格)
  function storyTimeSep(d, m, prev) {
    if (!d || !d.useStoryTime) return '';
    const cur = (m && m.st) ? String(m.st) : '';
    if (!cur) return '';
    const pst = (prev && prev.st) ? String(prev.st) : '';
    if (cur === pst) return '';
    return `<div class="xhs-grp-time">${esc(cur)}</div>`;
  }
  function applyAutoStoryTime(d, j) {
    if (d && d.useStoryTime && j && typeof j.storyTime === 'string' && j.storyTime.trim()) {
      d.storyTimeAuto = j.storyTime.trim().slice(0, 40);
    }
  }
  // 把中文数字/阿拉伯数字转成整数(用于"第N天""X点")
  function cnNum(s) {
    s = String(s || '').trim();
    if (/^\d+$/.test(s)) return parseInt(s);
    const map = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (s === '十') return 10;
    if (s.length === 1) return map[s] != null ? map[s] : 0;
    if (s[0] === '十') return 10 + (map[s[1]] || 0);
    if (s.includes('十')) { const p = s.split('十'); return (map[p[0]] || 1) * 10 + (p[1] ? (map[p[1]] || 0) : 0); }
    return map[s] != null ? map[s] : 0;
  }
  // 尽力把剧情时间串解析成可比较的数字;完全解析不出返回 null
  function storyTimeValue(s) {
    s = String(s || '').trim();
    if (!s) return null;
    let found = false, year = 0, month = 0, day = 0, rel = 0, hour = null, min = 0, mm;
    if ((mm = s.match(/(\d{4})\s*年/))) { year = +mm[1]; found = true; }
    if ((mm = s.match(/(\d{1,2})\s*月/))) { month = +mm[1]; found = true; }
    if ((mm = s.match(/(\d{1,2})\s*[日号]/))) { day = +mm[1]; found = true; }
    if ((mm = s.match(/第\s*([一二三四五六七八九十两\d]+)\s*天/))) { rel = cnNum(mm[1]); found = true; }
    if ((mm = s.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/))) { hour = +mm[1]; min = +mm[2]; found = true; }
    else if ((mm = s.match(/([0-2]?\d)\s*点\s*(\d{1,2})?\s*([分半])?/))) { hour = +mm[1]; if (mm[3] === '半') min = 30; else if (mm[2]) min = +mm[2]; found = true; }
    if (hour == null) {
      const seg = /凌晨|半夜/.test(s) ? 2 : /清晨|拂晓/.test(s) ? 5 : /早上|早晨|一早/.test(s) ? 7 : /上午/.test(s) ? 9 : /中午|正午/.test(s) ? 12 : /下午/.test(s) ? 15 : /傍晚|黄昏/.test(s) ? 18 : /晚上|夜里|夜晚|今晚|当晚|入夜/.test(s) ? 21 : /深夜/.test(s) ? 23 : null;
      if (seg != null) { hour = seg; found = true; }
    } else if (hour < 12 && /(下午|傍晚|黄昏|晚上|夜|今晚|当晚|深夜)/.test(s)) { hour += 12; }
    if (!found) return null;
    if (hour == null) hour = 12;
    const datePart = year * 10000 + month * 100 + day + rel;
    return datePart * 10000 + hour * 100 + min;
  }
  // 按剧情时间稳定重排消息数组(解析不出的沿用前一条时间、贴着邻居,尽量不打乱原顺序)。有变化返回 true
  function sortChatByStoryTime(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return false;
    let lastKey = -Infinity;
    const keyed = arr.map((m, i) => {
      let v = storyTimeValue(m && m.st);
      if (v == null) v = lastKey; else lastKey = v;
      return { m, i, v };
    });
    const sorted = keyed.slice().sort((a, b) => (a.v - b.v) || (a.i - b.i));
    if (!sorted.some((x, idx) => x.i !== idx)) return false;
    arr.length = 0;
    sorted.forEach(x => arr.push(x.m));
    return true;
  }
  // 让生成提示词额外要一个 storyTime 字段(仅在开启时)
  function storyTimeAsk(d) {
    if (!(d && d.useStoryTime)) return '';
    const prev = (d.storyTimeManual || d.storyTimeAuto || '').trim();
    const prevLine = prev ? `上一次记录的剧情时间是「${prev}」。剧情时间【只会前进、绝不倒退】:storyTime 必须等于或晚于「${prev}」——剧情确实又过了一段就往后写,没有明显推进就原样保持「${prev}」,【严禁】给出比它更早的时间。` : '';
    return `\n【附加】从上面剧情上下文/摘要里判断"现在剧情进行到的日期时间",放进 storyTime 字段(如"5月20日 周五 19:30"或"第二天清晨";读不出就给"")。${prevLine}`;
  }
  // 手动按钮:让 AI 从最近剧情读出当前时间
  async function extractStoryTime() {
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到剧情上下文'); return; }
    toastr.info('正在从剧情里读取时间…');
    const sys = `下面是一段角色扮演剧情的上下文/摘要。判断"现在剧情进行到的日期和时间",只回一个简短时间标签(例如"5月20日 周五 19:30"或"第二天清晨"或"2025年初冬"),不要解释;剧情里完全没有时间线索就只回"未知"。\n剧情:${ctx}`;
    const raw = await callXhsAPI(sys, '当前剧情时间是?', { noContext: true });
    const t = (raw || '').replace(/^["「『]+|["」』]+$/g, '').trim().slice(0, 40);
    const fresh = loadData();
    if (!t || t === '未知') { toastr.warning('剧情里没写明时间,可以手动填'); return; }
    fresh.storyTimeAuto = t;
    fresh.useStoryTime = true; // 读到时间顺便打开开关,省得忘了勾
    await saveData(fresh);
    refreshXhs();
    toastr.success('已开启剧情时间:' + t);
  }

  // ============ 工具 ============
  function getTop() { return window.parent || window.top || window; }
  // 用顶层窗口的 toastr(改成悬浮窗后,提示要显示在顶层文档里,否则会被手机盖住/不可见)
  const _noopToast = { info() {}, success() {}, warning() {}, error() {} };
  const toastr = (function () {
    try { const t = getTop(); if (t && t.toastr) return t.toastr; } catch (e) {}
    try { if (typeof window !== 'undefined' && window.toastr) return window.toastr; } catch (e) {}
    return _noopToast;
  })();
  function getTopJQ() {
    const TOP = getTop();
    return TOP.jQuery || TOP.$ || (typeof $ !== 'undefined' ? $ : null);
  }
  function getCtx() {
    try {
      const TOP = getTop();
      if (TOP.SillyTavern?.getContext) return TOP.SillyTavern.getContext();
      if (typeof SillyTavern !== 'undefined') return SillyTavern.getContext();
    } catch (e) {}
    return null;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function randomColor(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
    return `hsl(${Math.abs(h) % 360}, 60%, 55%)`;
  }

  // 输入缓存(iOS Safari兼容)
  function readInputCache(id) {
    const TOP = getTop();
    if (TOP.__xhsInputs?.[id] !== undefined) return TOP.__xhsInputs[id];
    const el = TOP.document.getElementById(id);
    return el ? (el.value || '') : '';
  }
  function clearInputCache(id) {
    const TOP = getTop();
    if (TOP.__xhsInputs) delete TOP.__xhsInputs[id];
  }

  // ============ 角色卡 + 世界书 ============
  function getCharFullInfo() {
    try {
      const charData = (typeof getCharData === 'function') ? getCharData() : {};
      return {
        name: charData.name || '',
        description: charData.description || '',
        personality: charData.personality || '',
        scenario: charData.scenario || '',
        mes_example: charData.mes_example || '',
      };
    } catch (e) {
      return { name: '', description: '', personality: '', scenario: '', mes_example: '' };
    }
  }
  // char 在小红书上的语言风格/打字习惯(全局,留空=按人设默认)
  function charXhsStyleLine(d) {
    const v = (d.charXhsPersona || '').trim();
    return v ? `【${charDisplayName(d)} 在小红书上的语言风格/打字习惯·优先遵守(只是 ta 在网上的说话方式,不改变 ta 的本性/人设)】:${v}\n` : '';
  }
  // 聊天里把整条 [图片:描述] / [图片] 解析成图片消息字段(带描述);不是图片返回 null
  function parseImgText(txt) {
    const m = String(txt || '').trim().match(/^\[\s*图片\s*[:：]?\s*([\s\S]*?)\]$/);
    return m ? { kind: 'image', text: (m[1] || '').trim() } : null;
  }
  // 聊天里把整条 [表情:名字] 解析成表情消息(名字须在用户导入的表情里);不是表情/没匹配返回 null
  function parseStickerText(txt, d) {
    const m = String(txt || '').trim().match(/^\[\s*表情\s*[:：]\s*([\s\S]*?)\]$/);
    if (!m) return null;
    const name = (m[1] || '').trim();
    const stk = ((d || loadData()).stickers || []).find(s => s && s.name === name);
    return stk ? { kind: 'sticker', url: stk.url, name: stk.name } : null;
  }
  // 整体聊天风格(活人感):只用于聊天类生成(私信/群聊),发帖评论不注入;对所有聊天的人通用
  function chatStyleLine(d) {
    const v = (d.chatStyle || '').trim();
    return v ? `【线上聊天的通用打字风格·所有人聊天时都按这个来(不是某个特定人的人设,是大家网上聊天的共同习惯)】:\n${v}\n` : '';
  }
  // char 跨渠道统一记忆:把 char 和 user 在小手机各处(小红书私信/微信私信/微信群/小红书评论)的近期互动收拢成一段喂给 char,让记忆连贯。
  // 按身份分级:微信侧 char 一直认识 user,微信记忆始终带;小红书侧只有"知道身份(knows)"时才带,否则保持马甲不穿帮。surface=本次生成所在 App。
  function charPhoneMemory(d, opts) {
    opts = opts || {};
    const knows = d.charKnowsAlt === 'knows';
    const surface = opts.surface;
    if (surface === 'xhs' && !knows) return ''; // 小红书侧没识破身份:当陌生人,绝不牵连真实记忆
    const cname = charDisplayName(d);
    const uname = d.userName;
    const txtOf = (m) => {
      if (m.kind === 'image') return m.text ? `[图片:${String(m.text).slice(0, 40)}]` : '[图片]';
      if (m.kind === 'share') return '[转发笔记]';
      if (m.kind === 'transfer' || m.kind === 'red') return '[转账]';
      if (m.kind === 'voice') return m.text ? `[语音]${String(m.text).slice(0, 30)}` : '[语音]';
      if (m.kind === 'sticker') return '[表情]';
      return m.text ? String(m.text).slice(0, 40) : '[非文字]';
    };
    const lines = [];
    (d.dms || []).filter(x => x.isChar).forEach(x => {
      if (opts.exclDmId === x.id) return;
      const isWx = x.app === 'wx';
      if (!isWx && !knows) return; // 小红书私信只有识破后才算"和 user 的记忆"
      if (!Array.isArray(x.messages) || !x.messages.length) return;
      const t = x.messages.slice(-6).map(m => `${m.role === 'me' ? uname : cname}:${txtOf(m)}`).join(' / ');
      if (t.trim()) lines.push(`· ${isWx ? '微信私信' : '小红书私信'}:${t}`);
    });
    (d.groups || []).filter(g => g.app === 'wx' && (g.members || []).some(mm => mm.isChar)).forEach(g => {
      if (opts.exclGroupId === g.id) return;
      const t = (g.chat || []).filter(m => m.role !== 'heart' && m.role !== 'sys').slice(-5).map(m => `${m.name || uname}:${txtOf(m)}`).join(' / ');
      if (t.trim()) lines.push(`· 微信群「${g.name}」:${t}`);
    });
    if (knows && !opts.exclComment) {
      const cmts = [];
      const scan = (posts, ownerLabel) => (posts || []).forEach(p => {
        const walk = (arr) => (arr || []).forEach(c => {
          if (c.author === cname || c.author === uname) cmts.push({ time: c.time || 0, line: `${c.author === uname ? uname : cname}「${String(c.text || '').slice(0, 36)}」(${ownerLabel}《${String(p.title || '').slice(0, 12)}》)` });
          walk(c.replies);
        });
        walk(p.comments);
      });
      scan(d.myPosts, '你帖子');
      scan((d.feed || []).filter(p => p.isChar || p.author === cname), 'ta帖子');
      cmts.sort((a, b) => (a.time || 0) - (b.time || 0));
      const recentCmts = cmts.slice(-6).map(c => c.line);
      if (recentCmts.length) lines.push(`· 小红书评论区:${recentCmts.join(' / ')}`);
    }
    if (!lines.length) return '';
    return `\n【你和 ta 在小手机各处的近期互动(小红书 + 微信,都是同一个你、同一个 ta,你都记得、要连贯,别当没发生过)】:\n${lines.join('\n')}\n(注:在【公开评论】或【群聊】里别逐字复述私聊里的私密内容,自然带过就行;私聊里正常聊。)\n`;
  }
  // 多人卡:某个出场角色和 user 的近期互动记忆(私信+评论);不认识 user 时整段屏蔽,防穿帮
  function castPhoneMemory(d, cm, opts) {
    opts = opts || {};
    if (!cm || !castKnows(cm)) return '';
    const cname = cm.name;
    const uname = d.userName;
    const txtOf = (m) => {
      if (m.kind === 'image') return m.text ? `[图片:${String(m.text).slice(0, 40)}]` : '[图片]';
      if (m.kind === 'share') return '[转发笔记]';
      if (m.kind === 'transfer' || m.kind === 'red') return '[转账]';
      if (m.kind === 'voice') return m.text ? `[语音]${String(m.text).slice(0, 30)}` : '[语音]';
      if (m.kind === 'sticker') return '[表情]';
      return m.text ? String(m.text).slice(0, 40) : '[非文字]';
    };
    const lines = [];
    (d.dms || []).filter(x => x.castId === cm.id && !x.castAlt).forEach(x => {
      if (opts.exclDmId === x.id) return;
      if (!Array.isArray(x.messages) || !x.messages.length) return;
      const t = x.messages.slice(-6).map(m => `${m.role === 'me' ? uname : cname}:${txtOf(m)}`).join(' / ');
      if (t.trim()) lines.push(`· ${x.app === 'wx' ? '微信私信' : '小红书私信'}:${t}`);
    });
    if (!opts.exclComment) {
      const cmts = [];
      const scan = (posts, ownerLabel) => (posts || []).forEach(p => {
        const walk = (arr) => (arr || []).forEach(c => {
          if (c.author === cname || c.author === uname) cmts.push({ time: c.time || 0, line: `${c.author === uname ? uname : cname}「${String(c.text || '').slice(0, 36)}」(${ownerLabel}《${String(p.title || '').slice(0, 12)}》)` });
          walk(c.replies);
        });
        walk(p.comments);
      });
      scan(d.myPosts, '你帖子');
      scan((d.feed || []).filter(p => p.castId === cm.id || p.author === cname), 'ta帖子');
      cmts.sort((a, b) => (a.time || 0) - (b.time || 0));
      const recent = cmts.slice(-6).map(c => c.line);
      if (recent.length) lines.push(`· 小红书评论区:${recent.join(' / ')}`);
    }
    if (!lines.length) return '';
    return `\n【你(${cname})和 ta 在小手机各处的近期互动(小红书+微信,都是同一个你、同一个 ta,你都记得、要连贯,别当没发生过)】:\n${lines.join('\n')}\n(注:在【公开评论】里别逐字复述私聊里的私密内容,自然带过就行;私聊里正常聊。)\n`;
  }
  function getRoleDesc() {
    const d = loadData();
    if (d.charBinding?.content) return d.charBinding.content;
    const c = getCharFullInfo();
    const parts = [];
    if (c.description) parts.push(c.description);
    if (c.personality) parts.push('【性格】' + c.personality);
    if (c.scenario) parts.push('【场景】' + c.scenario);
    if (c.mes_example) parts.push('【对话示例】' + c.mes_example);
    return parts.join('\n');
  }
  // 收集所有世界书条目(原始,不按启用过滤):{books:[书名], entries:[{name,content,enabled,disable}]}
  async function getWorldbookEntriesRaw() {
    const entries = [];
    const names = new Set();
    // 1) 当前角色卡绑定的世界书
    try {
      if (typeof getCharWorldbookNames === 'function') {
        const cn = await getCharWorldbookNames('current');
        if (cn) { if (cn.primary) names.add(cn.primary); (cn.additional || []).forEach(n => names.add(n)); }
      }
    } catch (e) { console.warn('[XHS] getCharWorldbookNames', e); }
    // 2) 当前聊天绑定的世界书
    try {
      if (typeof getChatWorldbookName === 'function') {
        const chn = await getChatWorldbookName('current');
        if (chn) names.add(chn);
      }
    } catch (e) {}
    // 3) 旧 API 兜底
    try {
      if (names.size === 0 && typeof getCharLorebooks === 'function') {
        const lb = await getCharLorebooks({ type: 'all' });
        if (lb) { if (lb.primary) names.add(lb.primary); (lb.additional || []).forEach(n => names.add(n)); }
      }
    } catch (e) {}
    // 读取每本世界书的条目(content/entry/text 多字段兜底;name/comment/title 当条目标题)
    for (const name of names) {
      try {
        let es = null;
        if (typeof getWorldbook === 'function') es = await getWorldbook(name);
        else if (typeof getLorebookEntries === 'function') es = await getLorebookEntries(name);
        if (Array.isArray(es)) {
          es.forEach(e => {
            if (!e) return;
            const content = e.content || e.entry || e.text || '';
            entries.push({ name: e.comment || e.name || e.title || e.key || '', content, enabled: e.enabled, disable: e.disable });
          });
        }
      } catch (e) { console.warn('[XHS] getWorldbook', name, e); }
    }
    // 4) 最后兜底:旧的 ctx.world_info
    if (entries.length === 0) {
      try {
        const ctx = getCtx();
        const wi = ctx && (ctx.world_info || ctx.worldInfo);
        if (wi && Array.isArray(wi.entries)) wi.entries.forEach(e => {
          if (!e) return;
          const content = e.content || e.entry || e.text || '';
          if (content) entries.push({ name: e.comment || '', content, enabled: e.enabled, disable: e.disable });
        });
      } catch (e) {}
    }
    return { books: [...names], entries };
  }
  // 给上下文注入用:拼接【启用】条目内容(行为同旧版:默认前40条/4000字)
  async function getWorldbookContent(charLimit, maxEntries) {
    const { entries } = await getWorldbookEntriesRaw();
    const out = entries.filter(e => e.enabled !== false && e.content).map(e => e.content);
    return out.slice(0, maxEntries || 40).join('\n').slice(0, charLimit || 4000);
  }
  async function syncCharBinding() {
    const info = getCharFullInfo();
    if (!info.name && !info.description) {
      return toastr.warning('当前对话没有 char 信息');
    }
    const parts = [];
    if (info.description) parts.push(`【角色描述】\n${info.description}`);
    if (info.personality) parts.push(`【性格】\n${info.personality}`);
    if (info.scenario) parts.push(`【场景】\n${info.scenario}`);
    const wb = await getWorldbookContent();
    const content = parts.join('\n\n') + (wb ? `\n\n【世界书】\n${wb}` : '');
    // world: 只含世界观/场景(给"发现页"路人帖子用,不含主角私人剧情)
    const world = [info.scenario ? `【场景】\n${info.scenario}` : '', wb ? `【世界书】\n${wb}` : '']
      .filter(Boolean).join('\n\n');
    const d = loadData();
    d.charBinding = { name: info.name || '当前角色', content, world, wbLen: wb.length, syncedAt: Date.now() };
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 已同步「${info.name}」 角色${content.length}字 / 世界书${wb.length}字`);
  }
  async function clearCharBinding() {
    const d = loadData();
    d.charBinding = null;
    await saveData(d);
    refreshXhs();
    toastr.info('已清除绑定');
  }

  // 世界观/城市背景(给"发现页"路人帖子用,不带主角私人剧情)
  function getWorldSetting() {
    const d = loadData();
    if (d.charBinding?.world) return d.charBinding.world;
    const c = getCharFullInfo();
    return (c.scenario || '');
  }

  // ============ 主对话上下文 ============
  async function buildContextSnippet() {
    try {
      const ctx = getCtx();
      if (!ctx || !Array.isArray(ctx.chat)) return '';
      const d = loadData();
      const summaryPart = d.storySummary ? `[剧情摘要]\n${d.storySummary}\n\n` : '';
      const N = d.contextMessages || 30;
      const recent = ctx.chat
        .filter(m => !(m.extra?.xhs_event || m.data?.xhs_event))
        .slice(-N)
        .map(m => {
          const who = m.is_user ? (m.name || '用户') : (m.name || '角色');
          return `${who}: ${(m.mes || '')}`;
        }).filter(Boolean).join('\n\n');
      const body = summaryPart + (recent ? `[最近剧情]\n${recent}` : '');
      const guard = body ? '\n\n【以上以最新剧情为准:① 剧情里【已经解决/已完成/已说明不用再做】的事(某个任务、某张卷子、某件麻烦),别反复提、别再催、别揪着不放,聊当下的事。② 【只能基于剧情里真实发生/明说过的内容来写,绝对不要捏造剧情里没发生过的细节】(谁做了什么、谁说了什么、点了什么、去了哪、谁坚持要怎样等都不能编);可以表达心情和感受,但别把没发生的事当成发生过的写出来。】' : '';
      return body + guard;
    } catch (e) { return ''; }
  }

  async function summarizeStory() {
    const ctx = getCtx();
    if (!ctx?.chat?.length) return toastr.warning('主对话还没有内容');
    toastr.info('正在总结剧情…');
    const fullStory = ctx.chat
      .filter(m => !m.extra?.xhs_event && !m.data?.xhs_event)
      .map(m => `${m.is_user ? '用户' : (m.name || '角色')}: ${(m.mes || '')}`)
      .join('\n\n');
    if (!fullStory) return toastr.warning('没有内容可总结');
    const sys = `把下面的角色扮演对话总结成精简的剧情大纲:
1. 用户和角色的关系
2. 当前场景
3. 重要事件(按时间)
4. 未解决的情绪和剧情

【只总结剧情事实,不要总结或评价角色的性格、语气、说话风格——那些以角色卡为准,不归你管】。纯文本输出,不要解释。`;
    const raw = await callXhsAPI(sys, fullStory);
    if (!raw) return;
    const d = loadData();
    d.storySummary = raw.trim();
    d.storySummaryAt = Date.now();
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 摘要 ${raw.length} 字`);
  }
  async function clearStorySummary() {
    const d = loadData();
    d.storySummary = null;
    d.storySummaryAt = null;
    await saveData(d);
    refreshXhs();
    toastr.info('已清除摘要');
  }

  // ============ API ============
  async function callXhsAPI(systemPrompt, userInput, opts) {
    opts = opts || {};
    const d0 = loadData();
    const cfg = d0.api;
    const useMain = cfg.useMainApi === true;
    if (!useMain && (!cfg.apiurl || !cfg.key) && !cfg.proxy_preset) {
      toastr.error('请先在设置里配置 API');
      return null;
    }
    try {
      // 全局附加提示词(我的风格规则):加到最前、最高优先级;路人评论NPC(noExtra)不吃
      const extra = (!opts.noExtra && (d0.extraPrompt || '').trim())
        ? `【全局风格规则·最高优先级·必须严格遵守(凌驾于下方一切设定之上)】\n${String(d0.extraPrompt).trim()}\n\n`
        : '';
      // 评论区路人 = 陌生网友,不能看到主线剧情;noContext 时不注入剧情上下文
      const ctxSnippet = opts.noContext ? '' : await buildContextSnippet();
      const fullSys = ctxSnippet
        ? `${extra}${systemPrompt}\n\n=== 当前剧情上下文 ===\n${ctxSnippet}\n=== 上下文结束 ===\n\n请基于以上剧情和角色,生成回复。`
        : `${extra}${systemPrompt}`;
      // 用 ordered_prompts 自定义提示词,不带预设。
      // system + user 都放进 ordered_prompts,不再额外传顶层 user_input,
      // 否则 user_input 会被自动追加到末尾,导致重复。
      const params = {
        should_stream: false,
        should_silence: true,
        ordered_prompts: [
          { role: 'system', content: fullSys },
          { role: 'user', content: userInput },
        ],
      };
      if (!useMain) {
        // 自定义副 API。source 留空时默认 openai 兼容格式。
        params.custom_api = {
          proxy_preset: cfg.proxy_preset || undefined,
          apiurl: cfg.apiurl || undefined,
          key: cfg.key || undefined,
          model: cfg.model || undefined,
          source: cfg.source || 'openai',
          temperature: cfg.temperature,
        };
      }
      // useMain === true 时不传 custom_api,generateRaw 会走酒馆当前主连接
      const result = await Promise.race([
        generateRaw(params),
        new Promise((_, rej) => setTimeout(() => rej(new Error('生成超时(180秒未返回)')), 180000)),
      ]);
      const text = typeof result === 'string' ? result : (result && result.content) || '';
      if (!text) toastr.warning('主API返回为空,检查酒馆主连接是否正常');
      return text;
    } catch (e) {
      console.error('[XHS] API error', e);
      toastr.error('API失败: ' + (e.message || e));
      return null;
    }
  }

  function tryParseJSON(raw, fallback = null) {
    if (!raw) return fallback;
    try {
      let s = raw.replace(/```json|```/g, '').trim();
      const i = s.indexOf('{'), j = s.lastIndexOf('}');
      const k = s.indexOf('['), l = s.lastIndexOf(']');
      const useArr = (k >= 0 && l > k) && (i < 0 || k < i);
      if (useArr) s = s.slice(k, l + 1);
      else if (i >= 0 && j > i) s = s.slice(i, j + 1);
      return JSON.parse(s);
    } catch (e) { return fallback; }
  }

  // ============ 同步到主对话 ============
  // 插入的系统消息不会被 ST 自动替换宏,所以写入前自己把 {{user}}/{{char}} 换成真实名字
  function resolveMacros(text) {
    let user = '', charName = '';
    try { const c = getCtx(); if (c) { user = c.name1 || ''; charName = c.name2 || ''; } } catch (e) {}
    const d = loadData();
    if (!user) user = d.userName || '我';
    if (!charName) charName = charDisplayName(d);
    return String(text == null ? '' : text).replace(/\{\{\s*user\s*\}\}/gi, user).replace(/\{\{\s*char\s*\}\}/gi, charName);
  }

  // 把干巴巴的 [app] 前缀改写成更像"真实发生的事"的画外音(保留 app 名,加 📱 标记)
  function frameXhsText(text) {
    return String(text || '')
      .replace(/^\[小红书·私信\]\s*/, '📱 小红书私信里,')
      .replace(/^\[小红书·([^\]]+)\]\s*/, '📱 小红书群「$1」里,')
      .replace(/^\[小红书\]\s*/, '📱 小红书上,')
      .replace(/^\[微信群·([^\]]+)\]\s*/, '📱 微信群「$1」里(这是一个群聊,下面是群里多个人的发言),')
      .replace(/^\[微信·([^\]]+)\]\s*/, '📱 微信「$1」,')
      .replace(/^\[微信\]\s*/, '📱 微信上,');
  }
  // 常驻深度注入:一句站在叙事AI角度的指引,让主线把标 📱 的内容当真实剧情来用(而不是当系统日志忽略)
  function pushXhsDirective() {
    try {
      const ctx = getCtx();
      if (!ctx || typeof ctx.setExtensionPrompt !== 'function') return;
      const IN_CHAT = (ctx.extension_prompt_types && ctx.extension_prompt_types.IN_CHAT != null) ? ctx.extension_prompt_types.IN_CHAT : 1;
      const SYS = (ctx.extension_prompt_roles && ctx.extension_prompt_roles.SYSTEM != null) ? ctx.extension_prompt_roles.SYSTEM : 0;
      const on = !!loadData().syncToMain;
      const txt = on
        ? '【叙事指引·重要】本对话中标有 📱 的消息,是手机里(小红书/微信)真实发生的剧情事件,相关角色都知情。请把它们当作真实剧情自然纳入接下来的叙事与对话、必要时让角色主动提及或回应,不要当作无关的系统日志而忽略。'
        : '';
      ctx.setExtensionPrompt('xhs_directive', txt, IN_CHAT, 4, false, SYS);
    } catch (e) { console.warn('[XHS] directive inject failed', e); }
  }
  async function syncToMain(text, hidden) {
    if (!loadData().syncToMain) return;
    pushXhsDirective();
    try {
      await createChatMessages([{
        role: 'system',
        name: 'XHS',
        message: resolveMacros(frameXhsText(text)),
        is_hidden: hidden,
        data: { xhs_event: true },
      }], { insert_before: 'end', refresh: 'affected' });
    } catch (e) { console.warn('[XHS] sync failed', e); }
  }

  // char 相关互动【强制】进主线(无视全局同步开关),且不隐藏(成为正式剧情)
  async function forceSyncToMain(text) {
    pushXhsDirective();
    try {
      await createChatMessages([{
        role: 'system', name: 'XHS', message: resolveMacros(frameXhsText(text)),
        is_hidden: false, data: { xhs_event: true },
      }], { insert_before: 'end', refresh: 'affected' });
    } catch (e) { console.warn('[XHS] forceSync failed', e); }
  }

  function charDisplayName(d) {
    return (d && d.charName && d.charName.trim()) ? d.charName.trim() : getCharName();
  }
  function isCharAcct(name, d) {
    if (!name) return false;
    return name === charDisplayName(d || loadData());
  }
  // char 改小红书名时,把旧名下 char 的帖子/评论/被回复名迁到新名,
  // 否则主页按"作者名===当前名"筛不到旧帖、会被当成没帖子而触发重拉(看着像被清空)
  function migrateCharName(d, oldCN, newCN) {
    const fixArr = (arr) => (arr || []).forEach(p => {
      if (p.author === oldCN) p.author = newCN;
      (p.comments || []).forEach(c => {
        if (c.author === oldCN) c.author = newCN;
        if (c.reply_to === oldCN) c.reply_to = newCN;
        (c.replies || []).forEach(r => {
          if (r.author === oldCN) r.author = newCN;
          if (r.reply_to === oldCN) r.reply_to = newCN;
        });
      });
    });
    fixArr(d.feed); fixArr(d.myPosts); fixArr(d.ficFeed);
    Object.values(d.npcProfiles || {}).forEach(prof => prof && fixArr(prof.posts));
    d.following = (d.following || []).map(f =>
      (typeof f === 'string') ? (f === oldCN ? newCN : f)
        : (f && f.name === oldCN ? Object.assign(f, { name: newCN }) : f));
  }
  function charBadge() {
    return '<span class="xhs-char-badge">💑</span>';
  }
  // 通知:cat = 'comment'(评论和@) | 'like'(赞和收藏) | 'follow'(新增关注)
  function addNotif(d, n) {
    d.notifs = d.notifs || [];
    d.notifs.unshift({ id: uid(), read: false, time: Date.now(), st: stStamp(d), cat: 'comment', ...n });
    if (d.notifs.length > 80) d.notifs = d.notifs.slice(0, 80);
  }
  function notifCatOf(n) { return n.cat || 'comment'; }
  function unreadNotifs(d, cat) {
    return (d.notifs || []).filter(n => !n.read && (!cat || notifCatOf(n) === cat)).length;
  }
  const XHS_NAME_POOL = [
    'momo', 'Yuki', '阿白Baii', '77怪', '小张啊', 'ostrich', '𝓛𝓲𝓼𝓪', 'y.', '陈某某', '一只栗子', 'cccc', '不语', '风信子', '芋圆啵啵', '深海', '夜宵选手', '阿喵', 'Leo', '橘子汽水', '困', '在逃布丁', '电子咸鱼', '柚子', '半糖', '阿七',
    '阿橘', '可乐不加冰', '游游', '不困', '麦麦', '一颗小草莓', 'BBQ', '想退休', '今天也emo', 'L.', '蜜桃乌龙', 'whatever', '咸鱼翻身', '阿斯巴甜', 'momoko', '不想上班', '南风', '是月亮诶', 'Cici', '小熊软糖', '阿far', 'zzz', '叁叁', '酸奶味', '困成猪', '一勺奶盖', 'Vivi', '海盐味的风',
    '#椒', '____', 'A.A', '陈陈陈', '碎碎念', '十一', 'oac', '布丁布丁', '六月', '阿元', 'Nora', '柠檬精本精', '想躺平', '小K', '炒饭', '夜行动物', 'momo的momo', '迷路的鲸', '草莓熊', '阿肉', 'Sigh', '九月', '糖不甩', '小废物', '阿狸', '是阿星诶', 'duck不必', '阿团', '冬眠中', '一只鸽',
    '盐汽水', '芒果味', '阿嚏', '没在听', '酥酥', 'Mxx', '阿巳', '困倦的鱼', '阿purple', '小满', '茶茶', '想发疯', 'EMO少女', '阿deer', '七秒记忆', '不摆烂', '阿樱'
  ];
  function randomXhsName() { return XHS_NAME_POOL[Math.floor(Math.random() * XHS_NAME_POOL.length)]; }
  function _sampleNames(n) {
    const a = XHS_NAME_POOL.slice(); const out = [];
    for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
    return out;
  }
  // 群有没有"未读":自上次进群后有没有新的 NPC 发言
  function groupUnread(g) { return (g.chat || []).some(m => (m.time || 0) > (g.seenAt || 0) && m.role === 'npc'); }
  function totalUnread(d) {
    return (d.dms || []).filter(x => x.unread && x.app !== 'wx').length + unreadNotifs(d) + (d.groups || []).filter(g => g.app !== 'wx' && groupUnread(g)).length;
  }
  // char 潜伏:马甲名 + 给主线的元标注
  const LURK_ALIAS_POOL = ['夜航船', '路过的风', '匿名观众', '江声入梦', '77号观察员', '楼下那位', '看客一枚', '沉默的鱼', '北岸有雾', '无名氏O', '潜水的猫', '某不愿透露姓名的人', '深海回声', '路灯下'];
  function genLurkAlias() { return LURK_ALIAS_POOL[Math.floor(Math.random() * LURK_ALIAS_POOL.length)]; }
  function lurkMetaNote(d) {
    return `(系统设定·仅叙事用:粉丝群成员「${d.charLurkAlias}」其实就是 {{char}} 本人,ta 用马甲偷偷潜伏在 {{user}} 的粉丝群里暗中围观;【{{user}} 完全不知道这是 {{char}}】,剧情里别让 {{user}} 发现、{{char}} 也不点破,除非剧情发展或玩家点了"揭穿"。)`;
  }
  // 当前怀疑度档位 → 指导 char 的表现
  function suspBand(d) {
    const s = d.charSuspicion || 0;
    if (s < 30) return `低(${s}/100):完全没感觉,把对方当【纯陌生网友】,绝不流露任何认出/在意,也别套近乎、别用命令/管教/亲昵的口吻。`;
    if (s < 70) return `中(${s}/100):顶多觉得"有点眼熟",但一律归为巧合;回复仍是【普通陌生网友】的口吻——绝不点破、不深究、不套近乎,【绝不】使用任何只有"认识 ta 本人"才会有的东西(私下的称呼/昵称/私人梗、对 ta 近况行程的了解、管教/命令/哄劝/亲昵的语气、把 ta 帖子里的私事当成你俩的共同经历)。`;
    if (s < 100) return `高(${s}/100):明显起疑,会忍不住【旁敲侧击、试探套话】,但证据还不够、仍不敢确定;【绝不】直接认定就是 ta、不喊破、也不用只有认识才有的称呼/命令——试探归试探,身份绝不点破。`;
    return `满(100/100):你几乎可以肯定这就是你认识的人了,但在 ta 亲口承认前仍未当面挑明(可以话里有话,但别直接喊破)。`;
  }
  // 给 char 互动注入"证据累计式怀疑"评估规则(只在 unknown 模式)
  function suspEvalRule(d) {
    if (d.charKnowsAlt === 'knows') return '';
    return `\n【怀疑度·证据评估(旁白层)】你({{char}})现实里认识 {{user}},了解 ta 的一些事。请判断这条内容里有没有跟"你认识的 {{user}}"【具体重合】的线索——同一件事/同一时间地点/私人梗/外貌特征(如泪痣)/共同经历这种"独特、不太可能巧合"的细节;泛泛内容(谁都会发的累/吃饭/吐槽/吵架)【不算】证据。
你目前累计怀疑度 ${d.charSuspicion || 0}/100。单条巧合不该让你笃定,要靠多条具体证据累积。请按当前档位演你的反应——${suspBand(d)}
【外在表现·红线】不管证据多吻合、你心里多怀疑、这帖内容多像你自己的经历,你【实际发出来的回复/私信】都必须严格停在当前档位:中档及以下=就是个普通陌生网友,【严禁】出现任何只有"认识 ta 本人"才会有的反应——别用私下的称呼/昵称/私人梗,别提 ta 的近况/行程/补课/共同经历,别用管教/命令/哄劝/亲昵的口吻,别表现得像和 ta 在一起或正在管 ta。所有"认出来"的反应一律压到【高档】才允许一点点试探、【满档】前都不许把对方当成 ta 本人来对待。
在 JSON 里额外给:"clues":[发现的具体重合线索,没有就空数组], "evidence":0~40(这条【新增】的实锤程度:泛泛/巧合 0~5;一个具体重合 10~20;多个强重合 25~40)。\n【线索必须真实·严禁编造】clues 里只能写【这条内容里 {{user}} 本人真实写出来的字句/真实信息】跟"你认识的 ta"之间【确实存在】的重合。严禁:① 把 {{char}}(你自己)说过的话、或别人说的话,当成 {{user}} 的发言写进线索(看清楚到底是谁说的);② 编造 ta 根本没写过的评论/内容;③ 硬掰根本不成立的"同音/谐音/形近/暗示"(比如两个字读音其实不同却硬说同音、牵强附会)。拿不准是否真重合/真同音,就【不算】线索。没有【确凿、经得起推敲】的重合,就 clues 留空、evidence=0。宁可漏判,也绝不靠瞎编凑证据。\n`;
  }
  // 累计怀疑度 + 记线索;返回这次加了多少分、新增哪些线索
  function applySuspicion(d, evidence, clues) {
    if (d.charKnowsAlt === 'knows') return { added: 0, newClues: [] };
    const mult = { slow: 0.55, normal: 1, fast: 1.7 }[d.suspSensitivity || 'slow'] || 0.55;
    const add = Math.round(Math.max(0, Math.min(40, Number(evidence) || 0)) * mult);
    d.charSuspicion = Math.min(100, (d.charSuspicion || 0) + add);
    const newClues = [];
    if (Array.isArray(clues)) {
      d.charClues = d.charClues || [];
      clues.forEach(c => {
        const s = String(c || '').trim();
        if (s && !d.charClues.includes(s)) { d.charClues.push(s); newClues.push(s); }
      });
      if (d.charClues.length > 30) d.charClues = d.charClues.slice(-30);
    }
    return { added: add, newClues };
  }
  // 怀疑度满 100 的处理:自动识破 或 仅强烈暗示
  function suspMaxNote(d) {
    if ((d.charSuspicion || 0) < 100 || d.charKnowsAlt === 'knows') return '';
    if (d.suspAutoReveal) {
      d.charKnowsAlt = 'knows';
      return ` ⚠{{char}} 的怀疑度已满,证据足够,ta 现在【确认】了这个账号就是 {{user}},马甲被识破。`;
    }
    return ` (⚠{{char}} 怀疑度已满,几乎笃定这就是 {{user}},只差一句挑明——可由剧情或"识破马甲"按钮收尾。)`;
  }
  // 给主线 AI 的元信息:映射小红书账号↔角色;并强硬约束 char 是否知道马甲
  function metaUserNote(d) {
    const cn = charDisplayName(d);
    const idmap = `小红书账号「${cn}」就是 {{char}} 本人;小红书账号「${d.userName}」就是 {{user}} 本人。`;
    if (d.charKnowsAlt === 'knows') {
      return `(系统设定·仅叙事用:${idmap}{{char}} 已经知道「${d.userName}」这个账号是 {{user}}。)`;
    }
    return `(⚠系统设定·仅供旁白/叙事使用,【严禁泄漏给 {{char}} 这个角色】:${idmap}【强制·必须遵守】接下来的剧情里,{{char}} 完全不知道、也无从得知「${d.userName}」这个账号是 {{user}}。{{char}} 绝对不可以:认出 {{user}}、叫出 {{user}} 的真名、暗示或"凭感觉/直觉"知道是 {{user}}、在心理描写里想到这是 {{user}}、或表现得早就认识。除非 {{user}} 在剧情中亲口承认身份、或玩家点了"识破马甲"按钮,否则 {{char}} 必须自始至终把这个账号当成一个【素不相识的陌生网友】。任何让 {{char}} 提前知道/猜中的写法都属于严重 OOC,禁止。)`;
  }

  // ===== 出场角色版「认识/不认识」悬念:镜像单 char,但每个角色独立记 c.knows / c.susp / c.clues =====
  function castKnows(c) { return !c || c.knows !== 'unknown'; }   // 默认认识
  function castSuspBand(c) {
    const s = c.susp || 0;
    if (s < 30) return `低(${s}/100):完全没感觉,把对方当【纯陌生网友】,绝不流露任何认出/在意,也别套近乎、别用命令/管教/亲昵口吻。`;
    if (s < 70) return `中(${s}/100):顶多觉得"有点眼熟",一律归为巧合;仍是【普通陌生网友】口吻——绝不点破、不深究、不套近乎,【绝不】用任何只有"认识 ta 本人"才有的东西(私下称呼/昵称/私人梗、对 ta 近况行程的了解、管教命令哄劝亲昵、把 ta 帖里的私事当成你俩共同经历)。`;
    if (s < 100) return `高(${s}/100):明显起疑,会忍不住【旁敲侧击、试探套话】,但证据不够、仍不敢确定;【绝不】直接认定就是 ta、不喊破、不用只有认识才有的称呼/命令。`;
    return `满(100/100):你几乎可以肯定这就是你认识的人了,但在 ta 亲口承认前仍未当面挑明(可话里有话,别直接喊破)。`;
  }
  function castSuspEvalRule(c) {
    if (castKnows(c)) return '';
    return `\n【怀疑度·证据评估(旁白层)】你(${c.name})现实里认识 {{user}},了解 ta 的一些事。判断这条内容里有没有跟"你认识的 {{user}}"【具体重合】的线索——同一件事/同一时间地点/私人梗/外貌特征/共同经历这种"独特、不太可能巧合"的细节;泛泛内容(谁都会发的累/吃饭/吐槽)【不算】证据。
你目前累计怀疑度 ${c.susp || 0}/100。单条巧合别笃定,靠多条具体证据累积。按当前档位演——${castSuspBand(c)}
【外在红线】不管多怀疑,实际回复都要严格停在当前档位:中档及以下=普通陌生网友,严禁任何只有"认识 ta 本人"才有的反应(私下称呼/私人梗/提 ta 近况行程/管教命令哄劝亲昵)。满档前不许把对方当 ta 本人对待。
JSON 里额外给:"clues":[发现的具体重合线索,没有就空数组],"evidence":0~40(这条【新增】实锤程度:泛泛/巧合 0~5;一个具体重合 10~20;多个强重合 25~40)。【线索必须真实,严禁编造/硬掰同音】拿不准就留空、evidence=0。\n`;
  }
  function castApplySusp(c, evidence, clues) {
    if (castKnows(c)) return { added: 0, newClues: [] };
    const mult = c.suspSens === '慢' ? 0.45 : c.suspSens === '快' ? 1.0 : 0.7;
    const add = Math.round(Math.max(0, Math.min(40, Number(evidence) || 0)) * mult);
    c.susp = Math.min(100, (c.susp || 0) + add);
    const newClues = [];
    if (Array.isArray(clues)) {
      c.clues = c.clues || [];
      clues.forEach(x => { const s = String(x || '').trim(); if (s && !c.clues.includes(s)) { c.clues.push(s); newClues.push(s); } });
      if (c.clues.length > 30) c.clues = c.clues.slice(-30);
    }
    return { added: add, newClues };
  }
  function castSuspMaxNote(c) {
    if ((c.susp || 0) < 100 || castKnows(c)) return '';
    return ` (⚠「${c.name}」怀疑度已满,几乎笃定这就是 {{user}},只差一句挑明——可由剧情或在花名册点"让 ta 认出你"收尾。)`;
  }
  function castMetaUserNote(c, d) {
    const idmap = `小红书/微信账号「${c.name}」就是出场角色「${c.name}」本人;账号「${d.userName}」就是 {{user}} 本人。`;
    if (castKnows(c)) return `(系统设定·仅叙事用:${idmap}「${c.name}」知道「${d.userName}」这个账号/对象就是 {{user}}。)`;
    return `(⚠系统设定·仅供旁白叙事,【严禁泄漏给「${c.name}」这个角色】:${idmap}【强制】接下来「${c.name}」完全不知道、也无从得知「${d.userName}」就是 {{user}};不可认出/叫真名/凭直觉知道/心理描写里想到是 {{user}}/表现得早认识。除非 {{user}} 亲口承认或玩家点了"让 ta 认出你",否则自始至终把这账号当【素不相识的陌生网友】。提前知道=严重 OOC,禁止。)`;
  }
  // 小号马甲(B):角色心里知道对面是 user,但 user 和其他角色不知道这小号是 ta
  function castAltMetaNote(c, dm, d) {
    return `(⚠系统设定·仅供旁白/叙事使用,【严禁泄漏给 {{user}} 以及卡里其他角色】:小红书小号「${dm.name}」其实就是出场角色「${c.name}」本人,ta 用这个马甲瞒着 {{user}} 接近 ta。「${c.name}」本人心里很清楚对面就是 {{user}}。【强制】在 {{user}} 亲自识破、或玩家点了"揭穿"之前,剧情里【{{user}} 和其他任何角色都不知道这个小号是「${c.name}」】——不许认出、不许点破、不许凭直觉猜到、不许在心理/旁白里写出这层关系。让 {{user}} 或别人提前知道=严重 OOC,禁止。)`;
  }
  const routeScroll = {};
  function mainScroller(bodyEl) {
    return bodyEl.querySelector('.xhs-scroll') || bodyEl.querySelector('.xhs-view-scroll');
  }

  async function navigate(route, ctx = {}) {
    const TOP = getTop();
    const $top = getTopJQ();
    const d = loadData();
    // 记住即将离开页面的滚动位置
    if ($top) {
      const b = $top('#xhs-body', TOP.document);
      if (b.length) { const sc = mainScroller(b[0]); if (sc) routeScroll[d.currentRoute] = sc.scrollTop; }
    }
    d.currentRoute = route;
    d.routeContext = ctx;
    await saveData(d);
    if (!$top) return;
    const body = $top('#xhs-body', TOP.document);
    if (body.length === 0) return;
    body.html(renderBody(loadData()));
    const raf = TOP.requestAnimationFrame || window.requestAnimationFrame || (fn => setTimeout(fn, 16));
    raf(() => {
      const sc = mainScroller(body[0]);
      const keepRoutes = ['feed', 'messages', 'profile', 'following', 'groups', 'char-profile', 'user-profile', 'cast-profile'];
      if (sc) sc.scrollTop = keepRoutes.includes(route) ? (routeScroll[route] || 0) : 0;
      const chat = body[0].querySelector('.xhs-grp-chat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    });
  }

  function renderBody(d) {
    if (d.currentApp === 'home') return renderHome(d);
    if (d.currentApp === 'set') return renderPhoneSettings(d);
    if (d.currentApp === 'charphone') {
      switch (d.currentRoute) {
        case 'cp-lock': return renderCharPhoneLock(d);
        case 'cp-wx': return renderCharPhoneWx(d);
        case 'cp-wx-chat': return renderCharPhoneWxChat(d);
        case 'cp-notes': return renderCharPhoneNotes(d);
        case 'cp-note': return renderCharPhoneNote(d);
        case 'cp-safari': return renderCharPhoneSafari(d);
        case 'cp-music': return renderCharPhoneMusic(d);
        case 'cp-taobao': return renderCharPhoneTaobao(d);
        case 'cp-tb-cart': return renderCharPhoneTbCart(d);
        case 'cp-tb-orders': return renderCharPhoneTbOrders(d);
        case 'cp-alipay': return renderCharPhoneAlipay(d);
        case 'cp-ali-bills': return renderCharPhoneAliBills(d);
        case 'cp-ali-assets': return renderCharPhoneAliAssets(d);
        case 'cp-ali-huabei': return renderCharPhoneAliHuabei(d);
        case 'cp-doubao': return renderCharPhoneDoubao(d);
        case 'cp-poop': return renderCharPhonePoop(d);
        default: return renderCharPhoneHome(d);
      }
    }
    if (d.currentApp === 'wx') {
      switch (d.currentRoute) {
        case 'wx-chats': return renderWxChats(d);
        case 'wx-contacts': return renderWxContacts(d);
        case 'wx-new-group': return renderWxNewGroup(d);
        case 'group-chat': return renderGroupChat(d);
        case 'wx-discover': return renderWxDiscover(d);
        case 'wx-me': return renderWxMe(d);
        case 'dm-chat': return renderDmChat(d);
        default: return renderWxChats(d);
      }
    }
    switch (d.currentRoute) {
      case 'feed': return renderFeed(d);
      case 'publish': return renderPublish(d);
      case 'view': return renderPostView(d);
      case 'messages': return renderMessages(d);
      case 'profile': return renderProfile(d);
      case 'following': return renderFollowing(d);
      case 'user-profile': return renderUserProfile(d);
      case 'char-profile': return renderCharProfile(d);
      case 'cast-profile': return renderCastProfile(d);
      case 'notifs': return renderNotifList(d);
      case 'dm-chat': return renderDmChat(d);
      case 'groups': return renderGroupList(d);
      case 'group-chat': return renderGroupChat(d);
      case 'settings': return renderSettings(d);
      default: return renderFeed(d);
    }
  }

  // ============ 桌面 / 分应用 ============
  function wxList(d) { return (d.dms || []).filter(x => x.app === 'wx' && !(isMultiCast(d) && x.isChar && !x.castId)); }
  function wxUnread(d) { return wxList(d).filter(x => x.unread).length + (d.groups || []).filter(g => g.app === 'wx' && groupUnread(g)).length; }
  function renderHome(d) {
    const xhsBadge = totalUnread(d);
    const wxBadge = wxUnread(d);
    const icons = d.appIcons || {};
    const icon = (app, emoji, label, bg, badge) => {
      const img = icons[app];
      const inner = img ? `<img class="xhs-app-img" src="${esc(img)}"/>` : emoji;
      return `
      <div class="xhs-app" data-action="open-app" data-app="${app}">
        <div class="xhs-app-icwrap">
          <div class="xhs-app-ic" style="background:${img ? 'transparent' : bg}">${inner}</div>
          ${badge ? `<span class="xhs-app-badge">${badge > 99 ? '99+' : badge}</span>` : ''}
        </div>
        <span class="xhs-app-name">${label}</span>
      </div>`;
    };
    const grad = (d.homeBg && d.homeBg.indexOf('url(') < 0) ? d.homeBg : 'linear-gradient(160deg,#8ec5fc,#e0c3fc)';
    const wallUrl = homeBgUrl(d);
    return `
      <div class="xhs-home" style="background:${grad};--home-fg:${esc(d.homeText || '#ffffff')}">
        ${wallUrl ? `<img class="xhs-home-wall" src="${esc(wallUrl)}" onerror="this.style.display='none'"/>` : ''}
        <div class="xhs-home-clock">
          <div class="xhs-home-time" id="xhs-home-time">--:--</div>
          <div class="xhs-home-date">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
        </div>
        <div class="xhs-home-grid">
          ${icon('xhs', '📕', '小红书', 'linear-gradient(135deg,#ff5b7f,#ff2442)', xhsBadge)}
          ${icon('wx', '💬', '微信', 'linear-gradient(135deg,#5fd36a,#1aad19)', wxBadge)}
          ${icon('set', '⚙️', '设置', 'linear-gradient(135deg,#b0b8c4,#79818c)', 0)}
          <div class="xhs-app" data-action="open-charphone"><div class="xhs-app-icwrap"><div class="xhs-app-ic" style="background:linear-gradient(135deg,#6a5acd,#3a2a6b)">📱${d.charPhoneAppIcon ? `<img class="xhs-app-img" referrerpolicy="no-referrer" src="${esc(d.charPhoneAppIcon)}" onerror="this.style.display='none'" style="position:absolute;inset:0"/>` : ''}</div></div><span class="xhs-app-name">ta 的手机</span></div>
        </div>
      </div>`;
  }
  async function openApp(app) {
    const d = loadData();
    d.currentApp = app;
    d.currentRoute = app === 'wx' ? 'wx-chats' : (app === 'xhs' ? 'feed' : (app === 'set' ? 'set-home' : d.currentRoute));
    d.routeContext = {};
    if (app === 'wx' && !isMultiCast(d)) getWxCharDm(d); // 确保微信里有 char 会话(多人卡不建卡名 char)
    await saveData(d);
    refreshXhs();
  }
  async function goHome() {
    const d = loadData();
    d.currentApp = 'home';
    d.routeContext = {};
    await saveData(d);
    refreshXhs();
    updateXhsClock();
  }
  // ============ 偷看 char 的手机(单人卡) ============
  async function genCharPhone() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」目前只支持单人卡'); return; }
    toastr.info('正在偷看 ta 的手机…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(4000, 40);
    const uname = d0.userName || '我';
    const ubio = (d0.userBio || '').trim();
    const sys = `你要生成「${cname}」这个人【自己手机里】的私密内容,供上帝视角偷看。一切都【严格基于 ta 的人设、世界书设定、当前主线剧情】,不许 OOC、不许编造跟设定冲突的人和事。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定(里面的 NPC 都按各自人设来写)】:\n${wb}\n` : ''}${ubio ? `【${uname}(机主在意的人)的资料】:${ubio}\n` : ''}
要生成三部分:
1) wx(微信):ta 和【世界书里其他 NPC】的私聊。按【ta 和每个 NPC 各自的人设、以及世界书设定】来写,贴合设定和当前剧情。给 3~6 个联系人(家人/朋友/同事/老板/暧昧对象/前任等——看世界书和人设里【真实存在】谁,别硬编)。【极其重要:绝对不要生成跟「${uname}」(也就是 {{user}} 机主本人,别名都算)的对话!ta 和 ${uname} 的聊天已经单独显示在「你们的聊天」里了,这里【只放 ta 跟除 ${uname} 以外的其他人】的私聊,严禁出现名字是 ${uname} 或其别名的联系人。】每人 2~6 条来回。视角是 ta 的手机:ta 自己发的标 "ta",对方标 "them"。每个联系人再给 time:你俩【最后说话的时间标签】(像"刚刚""昨天 22:10""周二""3天前"),不同联系人时间【各不相同】(有的刚聊、有的很久没聊),像真实微信列表。要透出潜台词(ta 私下怎么评价 ${uname}、ta 的秘密、ta 真实的状态情绪),但不许跟人设剧情冲突。
2) notes(备忘录):ta 的待办事项,以及 ta 自己的事/碎碎念/计划/灵感(都按 ta 的人设来写,贴合剧情)。
3) safari(搜索记录):ta 最近的浏览器搜索,要做到:①【反差】暴露 ta 真实的恐惧/无知/渴望/纠结,跟 ta 外在的冷静强硬相反;②【递进】几条之间体现思维变化(理智查询→情绪失控,或犹豫→坚定);③【真实】模仿真人搜索关键词习惯,用破碎短句或具体名词,【别写成完整句子】。每条给:query(搜索词)、time(这条搜的时间点,短标签,像"刚刚""凌晨2:41""昨天 23:10";失眠递进可以都落在深夜)、inner(ta 搜到答案后的【内心戏】,当时心里怎么想,1~3 句,可与外在反差)。${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"wx":[{"name":"联系人名","relation":"和ta的关系","time":"昨天 22:10","msgs":[{"from":"ta或them","text":"..."}]}],"notes":[{"title":"便签标题","body":"便签正文"}],"safari":[{"query":"搜索词(短、碎)","time":"凌晨2:41","inner":"搜到后的内心戏"}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 手机里的微信/备忘录/搜索记录`);
    if (!raw) { toastr.error('没偷看成功(模型没返回),再点一次🔄'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || (!Array.isArray(j.wx) && !Array.isArray(j.notes) && !Array.isArray(j.safari))) { toastr.warning('这次没解析出内容,再点一次🔄'); return; }
    const d = loadData();
    const _ualias = String(uname || '').split(/[\/、,，()()\s|]+/).map(s => s.trim().toLowerCase()).filter(s => s.length >= 1);
    const _isUserName = (nm) => { nm = String(nm || '').trim().toLowerCase(); if (!nm) return false; return _ualias.some(u => u && (nm === u || (u.length >= 2 && nm.indexOf(u) >= 0))); };
    d.charPhone = {
      genAt: Date.now(),
      wx: (Array.isArray(j.wx) ? j.wx : []).slice(0, 8).map(c => ({
        name: String(c.name || '联系人').slice(0, 16),
        relation: String(c.relation || '').slice(0, 20),
        time: String(c.time || '').slice(0, 12),
        msgs: (Array.isArray(c.msgs) ? c.msgs : []).slice(0, 12).map(m => ({ from: m.from === 'ta' ? 'ta' : 'them', text: String(m.text || '').slice(0, 200) })).filter(m => m.text),
      })).filter(c => c.msgs.length && !_isUserName(c.name)),
      notes: (Array.isArray(j.notes) ? j.notes : []).slice(0, 10).map(n => ({ title: String(n.title || '').slice(0, 30), body: String(n.body || '').slice(0, 600) })).filter(n => n.title || n.body),
      safari: (Array.isArray(j.safari) ? j.safari : []).slice(0, 14).map(s => ({ query: String(s.query || '').slice(0, 60), time: String(s.time || '').slice(0, 12), inner: String(s.inner || '').slice(0, 300) })).filter(s => s.query),
    };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 偷看完成');
  }
  async function genCharMusic() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('正在看 ta 最近听什么…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(3000, 30);
    const uname = d0.userName || '我';
    const sys = `你要生成「${cname}」网易云音乐里【最近播放】的歌,供上帝视角偷看。严格基于 ta 的人设、世界书设定、当前主线剧情和【此刻心情】来选歌,不许 OOC。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定】:\n${wb}\n` : ''}
要求:
- 选【最多 6 首】歌,符合 ta 的【真实音乐品味(看人设:年龄、性格、职业、文化背景)】和【当前心情/处境】。歌单是 ta 内心的投射:外表冷静的人可能在反复循环很丧/很烫的歌。
- 每首给 loops:ta 循环过的【次数】(整数,越戳 ta 心的循环越多,几次到几百次都真实)。
- 给【其中 2~4 首】歌写 comment + likes + date:comment 是 ta 在这首歌评论区底下留过的话——可以是【说这歌哪里好、为什么喜欢】,也可以是【ta emo 时借歌抒发的真实心事/想对谁说没说出口的话】(像网易云那种戳心热评的口吻,1~3句,【用 ta 自己的话,不要照搬歌词】);likes 是被点赞数(几十到几千);date 是留言日期(如"06-08")。其余歌【不要】comment。
- 【绝对不要写任何歌词】,只写歌名、歌手、循环次数、ta 的留言。歌要真实存在、对得上歌手。${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"songs":[{"title":"歌名","artist":"歌手","loops":87,"comment":"(2~4首有)ta的留言","likes":326,"date":"06-08"}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 最近在听的歌`);
    if (!raw) { toastr.error('没看成功(模型没返回),再点一次 ↻'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || !Array.isArray(j.songs)) { toastr.warning('这次没解析出歌单,再点一次 ↻'); return; }
    const clip = (s, n) => String(s || '').slice(0, n);
    const d = loadData();
    d.charPhoneMusic = {
      genAt: Date.now(),
      songs: j.songs.slice(0, 6).map(x => ({
        title: clip(x && x.title, 40), artist: clip(x && x.artist, 30),
        loops: Math.max(0, parseInt(x && x.loops) || 0),
        comment: clip(x && x.comment, 200),
        likes: Math.max(0, parseInt(x && x.likes) || 0),
        date: clip(x && x.date, 12),
      })).filter(s => s.title),
    };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 看完了 ta 在听什么');
  }
  async function genCharTaobao() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('正在翻 ta 的淘宝…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(3000, 30);
    const uname = d0.userName || '我';
    const sys = `你要生成「${cname}」淘宝里的内容,供上帝视角偷看。严格基于 ta 的人设、世界书设定、当前主线剧情,不许 OOC、不许编造跟设定冲突的东西。买什么要符合 ta 的【身份/经济状况/喜好/当前处境】。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定】:\n${wb}\n` : ''}
要生成:
- vip:ta 的会员等级(如"88VIP""超级会员",或留空,看人设)。
- saved:累计省钱金额(整数,看人设消费力)。
- cart:购物车里 ta 加购还没买的 3~7 件,要能【暴露 ta 真实的兴趣/小秘密/正在盘算的事】。每件:mall("淘宝"或"天猫"), shop 店铺名, title 商品名, spec 规格(颜色/型号/尺码), price 现价数字, origPrice 原价数字(≥现价), qty 数量。
- orders:ta 的订单 5~9 笔。每笔:mall, shop, title, spec, price, date(如"06-08"),以及 status(必须是下面之一):
  · "topay"=待付款(还没付钱);"toship"=待发货(付了还没发);"torecv"=待收货(在路上还没到);"reviewed"=已收到并评价过;"refund"=退款/售后中。
  · 大部分订单应是 "reviewed":给它 review = ta 对这商品写的评价(符合 ta 口吻,可吐槽可真情实感,1~2句)。
  · 只有真的退过货/在售后的才用 "refund":给它 complaint = ta 退货或售后时的吐槽(可空着不写,但别硬造退货)。
  · "toship""torecv" 是还没到手的,数量要真实(别把已买到的塞进来)。
  · review 只在 reviewed 上有,complaint 只在 refund 上有,其余留空。${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"vip":"88VIP","saved":35600,"cart":[{"mall":"淘宝","shop":"店铺","title":"商品","spec":"规格","price":1599,"origPrice":1999,"qty":1}],"orders":[{"mall":"天猫","shop":"店铺","title":"商品","spec":"规格","price":59,"date":"06-08","status":"reviewed","review":"ta的评价","complaint":""}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 的淘宝购物车和订单`);
    if (!raw) { toastr.error('没翻成功(模型没返回),再点一次 ↻'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || (!Array.isArray(j.cart) && !Array.isArray(j.orders))) { toastr.warning('这次没解析出内容,再点一次 ↻'); return; }
    const clip = (s, n) => String(s || '').slice(0, n);
    const num = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 100) / 100);
    const ig = (v) => Math.max(0, parseInt(v) || 0);
    const mall = (v) => String(v || '').indexOf('天猫') >= 0 ? '天猫' : '淘宝';
    const OK = ['topay', 'toship', 'torecv', 'reviewed', 'refund'];
    const d = loadData();
    d.charPhoneTaobao = {
      genAt: Date.now(),
      vip: clip(j.vip, 10),
      saved: ig(j.saved),
      cart: (Array.isArray(j.cart) ? j.cart : []).slice(0, 8).map(x => { const p = num(x && x.price); return { mall: mall(x && x.mall), shop: clip(x && x.shop, 24), title: clip(x && x.title, 60), spec: clip(x && x.spec, 30), price: p, origPrice: Math.max(p, num(x && x.origPrice)), qty: Math.max(1, ig(x && x.qty) || 1) }; }).filter(x => x.title),
      orders: (Array.isArray(j.orders) ? j.orders : []).slice(0, 10).map(x => { const st = OK.indexOf(x && x.status) >= 0 ? x.status : 'reviewed'; return { mall: mall(x && x.mall), shop: clip(x && x.shop, 24), title: clip(x && x.title, 60), spec: clip(x && x.spec, 30), price: num(x && x.price), date: clip(x && x.date, 12), status: st, review: st === 'reviewed' ? clip(x && x.review, 200) : '', complaint: st === 'refund' ? clip(x && x.complaint, 200) : '' }; }).filter(x => x.title),
    };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 翻完了 ta 的淘宝');
  }
  async function genCharAlipay() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('正在查 ta 的支付宝…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(3000, 30);
    const uname = d0.userName || '我';
    const sys = `你要生成「${cname}」支付宝里的内容,供上帝视角偷看。严格基于 ta 的人设、世界书设定、当前主线剧情,不许 OOC。金额要符合 ta 的【身份/经济状况】(明星/总裁和学生差很多)。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定】:\n${wb}\n` : ''}
要生成:
- balance:零钱余额(数字)。
- yuebao:余额宝金额(数字)。
- banks:绑定的银行卡存款,1~3 张,每张 {name 银行卡名(如"招商银行(8888)"), amount 金额}。
- bills:最近账单 8~12 笔,要【暴露 ta 的钱花在哪、收入哪来、小秘密】(转账备注、买的东西、医药费、偷偷给 ${uname} 花的钱、深夜的消费 等,和人设剧情呼应)。每笔:title 商家/事项, amount 金额数字(正数), type "out"支出 或 "in"收入, time 时间标签(如"今天 23:10""06-07"), note 备注/分类(可空), cat 分类(下面之一:餐饮/购物/转账/出行/医疗/缴费/娱乐/收入/其他)。
- huabei:花呗使用情况。owed=当前待还(借了还没还的钱,数字), repaid=本期已还(数字), limit=花呗额度(数字)。ta 不用花呗就都填 0。${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"balance":1280.5,"yuebao":52000,"banks":[{"name":"招商银行(8888)","amount":128000}],"huabei":{"owed":0,"repaid":0,"limit":5000},"bills":[{"title":"商家或事项","amount":35,"type":"out","time":"今天 22:10","note":"备注","cat":"餐饮"}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 的支付宝余额和账单`);
    if (!raw) { toastr.error('没查成功(模型没返回),再点一次 ↻'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || (!Array.isArray(j.bills) && j.balance == null)) { toastr.warning('这次没解析出内容,再点一次 ↻'); return; }
    const clip = (s, n) => String(s || '').slice(0, n);
    const num = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;
    const d = loadData();
    d.charPhoneAlipay = {
      genAt: Date.now(),
      balance: num(j.balance),
      yuebao: num(j.yuebao),
      banks: (Array.isArray(j.banks) ? j.banks : []).slice(0, 4).map(x => ({ name: clip(x && x.name, 30), amount: num(x && x.amount) })).filter(x => x.name),
      huabei: (() => { const h = j.huabei || {}; return { owed: Math.max(0, num(h.owed)), repaid: Math.max(0, num(h.repaid)), limit: Math.max(0, num(h.limit)), note: clip(h.note, 200) }; })(),
      bills: (Array.isArray(j.bills) ? j.bills : []).slice(0, 14).map(x => ({ title: clip(x && x.title, 40), amount: num(x && x.amount), type: x && x.type === 'in' ? 'in' : 'out', time: clip(x && x.time, 14), note: clip(x && x.note, 30), cat: clip(x && x.cat, 6) || '其他' })).filter(x => x.title),
    };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 查完了 ta 的支付宝');
  }
  async function genCharDoubao() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('正在偷看 ta 的豆包…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(3000, 30);
    const uname = d0.userName || '我';
    const sys = `你要生成「${cname}」和「豆包」(一个 AI 助手 app)的一段聊天记录,供上帝视角偷看。严格基于 ta 的人设、世界书设定、当前主线剧情,不许 OOC。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定】:\n${wb}\n` : ''}
生成 4 条消息,顺序严格是:① ${cname} 先抛出【一件事】——可以是一个生活问题,或者倾诉一桩烦心事/纠结/情绪(符合人设和当前剧情,是 ta 私下才会跟 AI 念叨的那种,可搞笑、可暴露 ta 的小情绪/小秘密、可和 ${uname} 有关);② 豆包回复;③ ${cname}【顺着豆包刚才的回复往下接】——是对豆包那番话的反应(吐槽、无语、将信将疑、被绕得更懵、或者反驳),**不是再问一个新问题**;④ 豆包再回复一次。
豆包的语气要【非常"豆包"】:极度热情、体贴到用力过猛、特爱拍胸脯打包票,满嘴排比和夸张承诺还爱加 emoji,就这个味儿——"我相信你,你一定能搞定""别怕,我陪着你,我一直都在""我帮你把这事儿拆解得明明白白,不焦虑、不踩坑👇""我给你最直接、最真相、最不绕弯、最一针见血的结论""绝对精准、不忽悠""有我给你兜底,放心去做吧"。
【硬性要求】豆包每一条回复的第一句,都必须用这种招牌开场白开头:要么是「我给你最X、最X、最X……」的连环排比,要么是「我来帮你把这件事拆解得明明白白,不X、不X👇」这种句式。X 里的形容词每次都随机换、别老重复(可选:最直接/最真相/最客观/最硬核/最干脆/最不绕弯/最一针见血/最戳痛点/最不墨迹/不焦虑/不踩坑/不忽悠…),保证每次生成开场白都不一样。开场白说完再接正文。
但是关键:豆包给的建议/分析要【其实不太靠谱、甚至是错的、有点离谱】,专门制造节目效果——一本正经地出馊主意、把简单的事整复杂、或者自信满满地胡说歪理,让 ${cname} 哭笑不得。(只要搞笑跑偏就行,别给真的危险、违法或有害的建议。)
每条 {from:"char"(${cname}发的) 或 "ai"(豆包发的), text:内容}。${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"msgs":[{"from":"char","text":"..."},{"from":"ai","text":"..."},{"from":"char","text":"..."},{"from":"ai","text":"..."}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 和豆包的对话`);
    if (!raw) { toastr.error('没偷看成功(模型没返回),再点一次 ↻'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || !Array.isArray(j.msgs)) { toastr.warning('这次没解析出内容,再点一次 ↻'); return; }
    const clip = (s, n) => String(s || '').slice(0, n);
    const d = loadData();
    d.charPhoneDoubao = { genAt: Date.now(), msgs: j.msgs.slice(0, 10).map(m => ({ from: m && m.from === 'ai' ? 'ai' : 'char', text: clip(m && m.text, 500) })).filter(m => m.text) };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 偷看完 ta 的豆包');
  }
  async function genCharPoop() {
    const d0 = loadData();
    if (isMultiCast(d0)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('正在查 ta 今天拉了没…');
    const cname = charDisplayName(d0);
    const role = getRoleDesc() || '';
    const wb = await getWorldbookContent(3000, 30);
    const uname = d0.userName || '我';
    const sys = `你要生成「${cname}」手机里【拉屎打卡】app 的内容,供上帝视角偷看。纯搞笑向,但要符合 ta 的人设/身体状况/当前处境(压力大可能便秘、吃辣喝大可能拉肚子、作息乱、出差水土不服 等,和世界书剧情呼应)。可以损可以好笑,但别写得太重口恶心。
【${cname} 的人设/性格】:\n${role}
${wb ? `【世界书/设定】:\n${wb}\n` : ''}
要生成:
- streak:ta 连续打卡的天数(整数)。
- todayPooped:今天到现在拉没拉(true 或 false,看 ta 状态,可以没拉)。
- tip:「健康小助手」给 ta 的一句搞笑提示(根据 ta 最近状态,如多喝水、少吃辣、别老蹲坑玩手机)。
- records:最近 3~6 次如厕记录(第一笔是最近一次/今天)。每笔:
  · date 日期标签(如"今天""昨天""06-08")
  · time 入厕时间(如"14:30")
  · duration 蹲了多久(如"8分钟")
  · shape 形状/质地的搞笑形容(如"金黄香蕉一气呵成""干硬小石子费了老劲""稀软不成形·警告")
  · color 颜色(如"健康黄褐""偏深")
  · smooth 顺畅度,只能从这几个里选:通畅 / 一般 / 费劲 / 便秘 / 拉肚子
  · didWhat ta 蹲坑时在干啥(刷手机/打游戏/回消息/发呆/看视频 等,可暴露 ta 私下状态)
  · comment ta 自己的一句吐槽/心声(符合人设口吻,可空)
  · rating 今日如厕体验,1~5 的整数星${cpAttitudeRule(uname)}
严格 JSON,不要解释:
{"streak":12,"todayPooped":true,"tip":"...","records":[{"date":"今天","time":"14:30","duration":"8分钟","shape":"金黄香蕉,一气呵成","color":"健康黄褐","smooth":"通畅","didWhat":"刷手机","comment":"...","rating":4}]}`;
    const raw = await callXhsAPI(sys, `生成 ${cname} 的拉屎打卡记录`);
    if (!raw) { toastr.error('没查成功(模型没返回),再点一次 ↻'); return; }
    const j = tryParseJSON(raw, null);
    if (!j || !Array.isArray(j.records)) { toastr.warning('这次没解析出记录,再点一次 ↻'); return; }
    const clip = (s, n) => String(s || '').slice(0, n);
    const OK = ['通畅', '一般', '费劲', '便秘', '拉肚子'];
    const d = loadData();
    d.charPhonePoop = {
      genAt: Date.now(),
      streak: Math.max(0, parseInt(j.streak) || 0),
      todayPooped: !!j.todayPooped,
      tip: clip(j.tip, 80),
      records: j.records.slice(0, 6).map(x => ({
        date: clip(x && x.date, 12), time: clip(x && x.time, 10), duration: clip(x && x.duration, 12),
        shape: clip(x && x.shape, 50), color: clip(x && x.color, 16),
        smooth: OK.indexOf(x && x.smooth) >= 0 ? x.smooth : '一般',
        didWhat: clip(x && x.didWhat, 20), comment: clip(x && x.comment, 120),
        rating: Math.min(5, Math.max(1, parseInt(x && x.rating) || 3)),
      })).filter(x => x.shape || x.time),
    };
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 查完了 ta 今天的如厕情况');
  }
  async function genCharAll() {
    const d = loadData();
    if (isMultiCast(d)) { toastr.info('「ta 的手机」暂时只支持单人卡'); return; }
    toastr.info('开始刷新 ta 手机的所有 app…(会有点慢,逐个生成)');
    try { await genCharPhone(); } catch (e) {}
    try { await genCharMusic(); } catch (e) {}
    try { await genCharTaobao(); } catch (e) {}
    try { await genCharAlipay(); } catch (e) {}
    try { await genCharDoubao(); } catch (e) {}
    try { await genCharPoop(); } catch (e) {}
    toastr.success('✓ ta 的手机全部刷新完成');
  }
  async function openCharPhone() {
    const d = loadData();
    if (isMultiCast(d)) { toastr.info('「ta 的手机」暂时只支持单人卡,多人卡敬请期待~'); return; }
    d.currentApp = 'charphone';
    d.currentRoute = 'cp-lock';
    d.routeContext = {};
    await saveData(d);
    refreshXhs();
    updateXhsClock();
    if (!d.charPhone) genCharPhone();
  }
  async function cpNav(route, ctx) {
    const d = loadData();
    d.currentRoute = route;
    d.routeContext = ctx || {};
    await saveData(d);
    refreshXhs();
    updateXhsClock();
  }
  function cpRealDm(d) { return (d.dms || []).find(x => x.app === 'wx' && x.isChar && !x.castId); }
  function cpAvatar(url, letter, size, bg) {
    size = size || 42; const rad = Math.round(size * 0.16);
    if (url) return `<img src="${esc(url)}" style="width:${size}px;height:${size}px;border-radius:${rad}px;object-fit:cover;flex-shrink:0"/>`;
    return `<div style="width:${size}px;height:${size}px;border-radius:${rad}px;background:${bg || '#cfd6e4'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size * 0.42)}px;flex-shrink:0">${esc((letter || '?').slice(0, 1))}</div>`;
  }
  function cpUserAvatar(d, size) { return cpAvatar(d.wxAvatar || d.userAvatar, d.userName || '我', size, d.avatarBg); }
  function cpCharAvatar(d, size) { const r = cpRealDm(d); return cpAvatar((r && r.avatar) || d.charAvatar, charDisplayName(d), size); }
  function cpNpcAvatar(d, name, size) { const ct = (d.dms || []).find(x => x.app === 'wx' && (x.remark === name || x.name === name) && x.avatar); let url = ct && ct.avatar; if (!url) { const cm = (d.cast || []).find(c => c.name === name); if (cm && cm.avatar) url = cm.avatar; } return cpAvatar(url, name, size); }
  function cpYuan(n) { n = Number(n) || 0; return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function cpMallTag(m) { return m === '天猫' ? '<span style="color:#ff0036;font-weight:700;font-size:12.5px">天猫</span>' : '<span style="color:#ff5000;font-weight:700;font-size:12.5px">淘宝</span>'; }
  function tbOrderIcon(kind) {
    const a = 'viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="#2b2b2b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    const dot = (cx) => `<circle cx="${cx}" cy="11" r=".95" fill="#2b2b2b" stroke="none"/>`;
    if (kind === 'pay') return `<svg ${a}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M15.5 11.5h5.5v3h-5.5a1.5 1.5 0 0 1 0-3z"/></svg>`;
    if (kind === 'ship') return `<svg ${a}><path d="M12 3.5l8.5 4-8.5 4-8.5-4 8.5-4z"/><path d="M3.5 7.5v9l8.5 4 8.5-4v-9"/><path d="M12 11.5v8.5"/></svg>`;
    if (kind === 'recv') return `<svg ${a}><rect x="2.5" y="7" width="11" height="8" rx="1"/><path d="M13.5 9.5h4l3 3.2V15h-7z"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17.5" cy="17.5" r="1.7"/></svg>`;
    if (kind === 'rate') return `<svg ${a}><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4A1.5 1.5 0 0 1 2.5 14V7A1.5 1.5 0 0 1 4 5.5z"/>${dot(8.5)}${dot(12)}${dot(15.5)}</svg>`;
    return `<svg ${a}><circle cx="12" cy="12" r="9"/><path d="M8.5 8l3.5 4 3.5-4M12 12v5M9.5 13.2h5M9.5 15.5h5"/></svg>`;
  }
  function cpTbTabs(active) {
    const ic = (c, p) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const home = (c) => ic(c, '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>');
    const msg = (c) => ic(c, '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>');
    const cart = (c) => ic(c, '<path d="M3 4h2l2.2 11.3a1.5 1.5 0 0 0 1.5 1.2h8.5a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>');
    const my = (c) => ic(c, '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>');
    const tab = (label, route, svg, on) => `<div ${route ? `data-action="cp-open" data-route="${route}"` : ''} style="flex:1;text-align:center;cursor:${route ? 'pointer' : 'default'}"><div style="display:flex;justify-content:center">${svg(on ? '#ff5000' : '#9a9a9a')}</div><div style="font-size:10.5px;margin-top:2px;color:${on ? '#ff5000' : '#9a9a9a'}">${label}</div></div>`;
    return `<div style="display:flex;align-items:center;padding:7px 0 9px;background:#fff;border-top:1px solid #eee;flex-shrink:0">${tab('首页', '', home, false)}${tab('消息', '', msg, false)}${tab('购物车', 'cp-tb-cart', cart, active === 'cart')}${tab('我的淘宝', 'cp-taobao', my, active === 'my')}</div>`;
  }
  function aliIcon(kind) {
    const w = (bg, inner, rad) => `<span style="width:28px;height:28px;border-radius:${rad || '50%'};background:${bg};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:13px;font-weight:700">${inner}</span>`;
    if (kind === 'bill') return w('linear-gradient(135deg,#ff9a3d,#ff5e3a)', '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M6 8h12M6 12h12M6 16h7"/></svg>', '9px');
    if (kind === 'asset') return w('#1677ff', '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 4a8 8 0 1 0 8 8h-8z" opacity=".55"/><path d="M12 4v8h8a8 8 0 0 0-8-8z"/></svg>');
    if (kind === 'balance') return w('#1677ff', '¥');
    if (kind === 'yuebao') return w('linear-gradient(135deg,#ffb14e,#ff7a18)', '<span style="font-size:13px">宝</span>');
    if (kind === 'huabei') return w('#1f8fff', '<span style="font-size:14px">花</span>');
    if (kind === 'vip') return w('#1677ff', 'V');
    if (kind === 'shop') return w('linear-gradient(135deg,#4d9bff,#1677ff)', '<span style="font-size:13px">商</span>', '9px');
    return w('#1677ff', '¥');
  }
  function cpAliTabs(active) {
    const ic = (c, p) => `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const home = (c) => ic(c, '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>');
    const fin = (c) => ic(c, '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 10h4M9.5 12.5h4"/>');
    const vid = (c) => ic(c, '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M10 9.5l5 2.5-5 2.5z"/>');
    const msg = (c) => ic(c, '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>');
    const my = (c) => ic(c, '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>');
    const tab = (label, route, svg, on) => `<div ${route ? `data-action="cp-open" data-route="${route}"` : ''} style="flex:1;text-align:center;cursor:${route ? 'pointer' : 'default'}"><div style="display:flex;justify-content:center">${svg(on ? '#1677ff' : '#9a9a9a')}</div><div style="font-size:10.5px;margin-top:2px;color:${on ? '#1677ff' : '#9a9a9a'}">${label}</div></div>`;
    return `<div style="display:flex;align-items:center;padding:7px 0 9px;background:#fff;border-top:1px solid #eee;flex-shrink:0">${tab('首页', '', home, false)}${tab('理财', '', fin, false)}${tab('视频', '', vid, false)}${tab('消息', '', msg, false)}${tab('我的', 'cp-alipay', my, active === 'my')}</div>`;
  }
  function cpAttitudeRule(uname) {
    return `\n【会不会牵扯到 ${uname}(很重要,别穿帮)】:先依据人设+世界书+当前剧情,判断此刻 ta 对 ${uname} 的【真实态度】和【关系到了哪一步】。
- 只有当 ta 对 ${uname} 确实已经有好感/在意、且剧情真到了那一步 → 才可以让一点【暗戳戳的、没明说的在意】藏进这些痕迹(查 ${uname} 的喜好、犹豫要不要买的同款、备注里的潜台词…),但【绝不超前于当前关系阶段】。
- 如果 ta 对 ${uname} 还没那个意思(不熟/无感/甚至讨厌)→【不要硬塞任何跟 ${uname} 有关的暧昧暗流】,就正常写 ta 自己的社交、秘密、日常喜好,${uname} 可以根本不出现。
料必须从【真实关系】里自然长出来,绝不为了有看头硬编不存在的好感。`;
  }
  function cpBillIcon(s) {
    s = String(s || '');
    if (/转账|红包|发给|收款/.test(s)) return '💸';
    if (/餐|吃|饭|外卖|奶茶|咖啡|食|烧烤|火锅/.test(s)) return '🍜';
    if (/打车|出行|地铁|公交|加油|油费|车/.test(s)) return '🚕';
    if (/药|医院|挂号|诊|院/.test(s)) return '💊';
    if (/话费|流量|充值|电话/.test(s)) return '📱';
    if (/淘宝|京东|购|买|商城|店|超市/.test(s)) return '🛍️';
    if (/电|水|气|物业|房租|缴费/.test(s)) return '🏠';
    if (/烟|酒/.test(s)) return '🚬';
    if (/工资|收入|报酬|奖金|分成/.test(s)) return '🪙';
    return '💰';
  }
  function renderCharPhoneHome(d) {
    const cp = d.charPhone;
    const bg = d.charPhoneBg || '';
    const isUrl = bg && /^https?:\/\//i.test(bg);
    const grad = (bg && !isUrl) ? bg : 'linear-gradient(160deg,#2b2540,#4a3a6b)';
    const dark = d.charPhoneTextColor === 'dark';
    const txt = dark ? '#222' : '#fff';
    const shadow = dark ? 'none' : '0 1px 4px rgba(0,0,0,.4)';
    const lblShadow = dark ? 'none' : '0 1px 3px rgba(0,0,0,.4)';
    const ic = d.charPhoneIcons || {};
    const tile = (route, key, emoji, label, count) => {
      const url = ic[key];
      const inner = url ? `${emoji}<img src="${esc(url)}" referrerpolicy="no-referrer" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:15px"/>` : emoji;
      return `
      <div data-action="cp-open" data-route="${route}" style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer">
        <div style="position:relative;width:58px;height:58px;border-radius:15px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden">${inner}</div>
        <span style="color:${txt};font-size:12px;text-shadow:${lblShadow}">${label}</span>
      </div>`;
    };
    const refreshBtn = `<div data-action="cp-refresh-all" title="刷新全部 app(较慢)" style="position:absolute;top:14px;right:16px;z-index:3;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="${dark ? '#444' : '#fff'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><polyline points="20.5 3.5 20.5 8 16 8"/></svg></div>`;
    return `
      <div style="position:relative;flex:1;background:${grad};overflow:hidden;display:flex;flex-direction:column">
        ${isUrl ? `<img src="${esc(bg)}" referrerpolicy="no-referrer" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0"/>` : ''}
        ${refreshBtn}
        <div style="position:relative;z-index:1;text-align:center;padding:54px 0 30px;color:${txt};text-shadow:${shadow}">
          <div id="xhs-home-time" style="font-size:50px;font-weight:200;letter-spacing:1px">--:--</div>
        </div>
        <div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);gap:16px 8px;padding:10px 18px">
          ${tile('cp-wx', 'wx', '💬', '微信', cp ? cp.wx.length : 0)}
          ${tile('cp-notes', 'notes', '📝', '备忘录', cp ? cp.notes.length : 0)}
          ${tile('cp-safari', 'safari', '🧭', 'Safari', cp ? cp.safari.length : 0)}
          ${tile('cp-music', 'music', '🎵', '网易云', 0)}
          ${tile('cp-taobao', 'taobao', '🛒', '淘宝', 0)}
          ${tile('cp-alipay', 'alipay', '💰', '支付宝', 0)}
          ${tile('cp-doubao', 'doubao', '🫛', '豆包', 0)}
          ${tile('cp-poop', 'poop', `<img src="${POOP_IMG}" style="width:84%;height:84%;object-fit:contain"/>`, '拉了吗', 0)}
        </div>
      </div>`;
  }
  function renderCharPhoneLock(d) {
    const dark = d.charPhoneTextColor === 'dark';
    const txt = dark ? '#222' : '#fff';
    const shadow = dark ? 'none' : '0 2px 8px rgba(0,0,0,.45)';
    const bg = d.charPhoneLockBg || d.charPhoneBg || '';
    const isUrl = bg && /^https?:\/\//i.test(bg);
    const grad = (bg && !isUrl) ? bg : 'linear-gradient(160deg,#2b2540,#4a3a6b)';
    let date = '';
    try { date = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }); } catch (e) {}
    return `
      <div data-action="cp-unlock" style="position:relative;flex:1;background:${grad};overflow:hidden;display:flex;flex-direction:column;cursor:pointer">
        ${isUrl ? `<img src="${esc(bg)}" referrerpolicy="no-referrer" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0"/>` : ''}
        <div style="position:relative;z-index:1;text-align:center;padding:62px 0 0;color:${txt};text-shadow:${shadow}">
          <div style="font-size:15px;font-weight:500;opacity:.95">${esc(date)}</div>
          <div id="xhs-home-time" style="font-size:68px;font-weight:200;letter-spacing:1px;margin-top:2px;line-height:1.05">--:--</div>
        </div>
        <div style="flex:1"></div>
        <div style="position:relative;z-index:1;text-align:center;padding-bottom:34px;color:${txt};text-shadow:${shadow}">
          <div style="font-size:13px;opacity:.92">点击解锁</div>
        </div>
      </div>`;
  }
  function cpTopbar(title, backRoute, bg, refreshAction) {
    const right = refreshAction ? `<button class="xhs-icon-btn" data-action="${refreshAction}" title="重新生成">↻</button>` : `<span style="width:32px"></span>`;
    return `<div class="xhs-topbar"${bg ? ` style="background:${bg}"` : ''}><button class="xhs-icon-btn" data-action="cp-back" data-route="${backRoute}">‹</button><span class="xhs-topbar-title">${esc(title)}</span>${right}</div>`;
  }
  function renderCharPhoneWx(d) {
    const cp = d.charPhone || { wx: [] };
    const real = cpRealDm(d);
    const rowStyle = 'display:flex;align-items:center;gap:11px;padding:12px 14px;background:#fff;border-bottom:1px solid #f0f0f0;cursor:pointer';
    const timeEl = (t) => t ? `<div style="font-size:11px;color:#bbb;flex-shrink:0;align-self:flex-start;margin-top:2px">${esc(t)}</div>` : '';
    const preview = (m) => m ? (m.kind === 'sticker' ? '[表情]' : (m.kind === 'image' ? '[图片]' : (m.kind === 'voice' ? '[语音]' : (m.text || '')))) : '';
    const rows = [];
    if (real && (real.messages || []).length) {
      const last = [...real.messages].reverse().find(m => m.text || m.kind);
      const rt = (d.useStoryTime && last && last.st) ? String(last.st) : '';
      rows.push(`<div style="${rowStyle}" data-action="cp-open-chat" data-idx="real">${cpUserAvatar(d, 44)}<div style="flex:1;min-width:0"><div style="font-size:15px;color:#222">${esc(d.userName || '我')}</div><div style="font-size:12.5px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(preview(last).slice(0, 26))}</div></div>${timeEl(rt)}</div>`);
    }
    (cp.wx || []).forEach((c, i) => {
      const last = c.msgs[c.msgs.length - 1];
      rows.push(`<div style="${rowStyle}" data-action="cp-open-chat" data-idx="${i}">${cpNpcAvatar(d, c.name, 44)}<div style="flex:1;min-width:0"><div style="font-size:15px;color:#222">${esc(c.name)}</div><div style="font-size:12.5px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((last && last.text || '').slice(0, 26))}</div></div>${timeEl(c.time)}</div>`);
    });
    return cpTopbar('微信', 'cp-home', '', 'cp-refresh') + `<div class="xhs-scroll" style="background:#ededed">${rows.join('') || '<div class="xhs-empty">没刷到聊天,回上一页点 🔄</div>'}</div>`;
  }
  function renderCharPhoneWxChat(d) {
    const cp = d.charPhone || { wx: [] };
    const idx = d.routeContext.cpChat;
    const taAv = cpCharAvatar(d, 38);
    const cpBubbleRow = (m, mine, av) => {
      let body;
      if (m.kind === 'sticker' && m.url) body = `<img src="${esc(m.url)}" style="width:92px;height:92px;object-fit:contain"/>`;
      else if (m.kind === 'image') body = `<div style="padding:8px 11px;border-radius:9px;background:#fff;color:#888;font-size:13px">🖼 ${esc(m.text || '图片')}</div>`;
      else if (m.kind === 'voice') body = `<div style="padding:8px 14px;border-radius:9px;background:${mine ? '#95ec69' : '#fff'};font-size:14px;color:#1a1a1a">▶ ${m.sec || 1}″${m.text ? ' ' + esc(m.text) : ''}</div>`;
      else { if (!m.text) return ''; body = `<div style="padding:8px 11px;border-radius:9px;font-size:14px;line-height:1.45;background:${mine ? '#95ec69' : '#fff'};color:#1a1a1a;word-break:break-word">${esc(m.text)}</div>`; }
      return `<div style="display:flex;justify-content:${mine ? 'flex-end' : 'flex-start'};margin:9px 0"><div style="display:flex;gap:8px;align-items:flex-start;flex-direction:${mine ? 'row-reverse' : 'row'};max-width:82%">${av}${body}</div></div>`;
    };
    let title = '', rows = [];
    if (idx === 'real') {
      const real = cpRealDm(d);
      const uAv = cpUserAvatar(d, 38);
      title = (d.userName || '我');
      const msgs = (real ? real.messages : []).filter(m => m.role !== 'heart' && (m.text || m.kind === 'sticker' || m.kind === 'image' || m.kind === 'voice'));
      rows = msgs.map((m, i) => { const mine = m.role === 'npc'; return storyTimeSep(d, m, msgs[i - 1]) + cpBubbleRow(m, mine, mine ? taAv : uAv); });
    } else {
      const c = cp.wx[Number(idx)];
      if (!c) return renderCharPhoneWx(d);
      const cAv = cpNpcAvatar(d, c.name, 38);
      title = c.name;
      rows = (c.time ? [`<div class="xhs-grp-time">${esc(c.time)}</div>`] : []).concat(c.msgs.map(m => { const mine = m.from === 'ta'; return cpBubbleRow({ text: m.text }, mine, mine ? taAv : cAv); }));
    }
    return cpTopbar(title, 'cp-wx') + `<div class="xhs-scroll" style="background:#ededed;padding:10px 12px">${rows.join('') || '<div class="xhs-empty">没有消息</div>'}</div>`;
  }
  function renderCharPhoneNotes(d) {
    const cp = d.charPhone || { notes: [] };
    const rows = (cp.notes || []).map((n, i) => {
      const prev = String(n.body || '').replace(/\n/g, ' ').trim().slice(0, 32);
      return `<div data-action="cp-note-open" data-idx="${i}" style="padding:11px 16px;border-bottom:1px solid #efece4;cursor:pointer;background:#fff">
        <div style="font-size:15px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.title || '新建备忘录')}</div>
        <div style="font-size:12.5px;color:#a3a097;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${esc(prev || '没有其他文本')}</div>
      </div>`;
    }).join('');
    return `
      <div class="xhs-topbar" style="background:#fcfbf7"><button class="xhs-icon-btn" data-action="cp-back" data-route="cp-home" style="color:#e0a91c">‹</button><span class="xhs-topbar-title"></span><button class="xhs-icon-btn" data-action="cp-refresh" title="重新生成" style="color:#e0a91c">↻</button></div>
      <div class="xhs-scroll" style="background:#fcfbf7">
        <div style="font-size:22px;font-weight:800;color:#111;padding:4px 16px 12px">备忘录</div>
        ${rows || '<div class="xhs-empty">空空如也,回上一页点 🔄</div>'}
        <div style="height:40px"></div>
      </div>`;
  }
  function renderCharPhoneNote(d) {
    const cp = d.charPhone || { notes: [] };
    const n = (cp.notes || [])[Number(d.routeContext.cpNote)];
    if (!n) return renderCharPhoneNotes(d);
    const dt = new Date(cp.genAt || Date.now()).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const y = '#e0a91c';
    const svg = (inner) => `<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="${y}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    const icChecklist = svg('<circle cx="5" cy="7" r="2.2"/><path d="M3.8 7l.9.9 1.5-1.7"/><line x1="9.5" y1="7" x2="20" y2="7"/><circle cx="5" cy="15" r="2.2"/><line x1="9.5" y1="15" x2="20" y2="15"/>');
    const icClip = svg('<path d="M20.5 11l-8.6 8.6a3.8 3.8 0 0 1-5.4-5.4l8.7-8.7a2.5 2.5 0 0 1 3.6 3.6l-8.1 8.1a1.25 1.25 0 0 1-1.8-1.8l7.4-7.4"/>');
    const icMarkup = svg('<circle cx="12" cy="12" r="9"/><path d="M15.4 8.6l-4.8 4.8-1.1 2.5 2.5-1.1 4.8-4.8a1.2 1.2 0 0 0-1.4-1.4z"/>');
    const icCompose = svg('<path d="M18.5 13v5.5A1.5 1.5 0 0 1 17 20H5.5A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5.5 5.5H11"/><path d="M16.5 4l3.5 3.5-7.3 7.3-4 .9.9-4z"/>');
    const tools = `<div style="display:flex;align-items:center;gap:30px;padding:11px 24px;border-top:1px solid #eee;background:#fcfbf7">${icChecklist}${icClip}${icMarkup}<span style="margin-left:auto">${icCompose}</span></div>`;
    return `
      <div class="xhs-topbar" style="background:#fcfbf7"><button class="xhs-icon-btn" data-action="cp-back" data-route="cp-notes" style="color:#e0a91c">‹</button><span class="xhs-topbar-title"></span><span style="color:#e0a91c;font-size:15px;letter-spacing:2px">⤴&nbsp;⋯</span></div>
      <div class="xhs-scroll" style="background:#fff;padding:16px 20px">
        <div style="text-align:center;font-size:11px;color:#b4b1a8;margin-bottom:14px">${dt}</div>
        <div style="font-size:17px;font-weight:700;color:#111;margin-bottom:9px">${esc(n.title || '')}</div>
        <div style="font-size:13.5px;color:#333;line-height:1.75;white-space:pre-wrap">${esc(n.body || '')}</div>
        <div style="height:24px"></div>
      </div>
      ${tools}`;
  }
  function renderCharPhoneSafari(d) {
    const cp = d.charPhone || { safari: [] };
    const open = d.routeContext.cpSafari;
    const googleLogo = `<div style="text-align:center;padding:24px 0 16px"><span style="font-size:34px;font-weight:600;letter-spacing:-1px;font-family:Arial,sans-serif"><span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span></span></div>`;
    const searchBar = `<div style="margin:0 14px 16px;background:#fff;border-radius:22px;padding:11px 18px;box-shadow:0 1px 6px rgba(0,0,0,.08)"><span style="color:#bbb;font-size:14px">搜索或输入网址</span></div>`;
    const histHeader = `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 18px 6px"><span style="color:#888;font-size:13px">搜索历史</span><span data-action="clear-cp-search" style="color:#888;font-size:13px;cursor:pointer">清除记录</span></div>`;
    const clk = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9a9a9e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M3.6 12a8.4 8.4 0 1 0 2.7-6.2"/><polyline points="3 4.4 3 8.1 6.7 8.1"/><polyline points="12 7.6 12 12 15 13.8"/></svg>`;
    const rows = (cp.safari || []).map((s, i) => `
      <div data-action="cp-safari-toggle" data-idx="${i}" style="padding:13px 18px;border-top:1px solid #eaeaea;cursor:pointer;background:#fff">
        <div style="display:flex;align-items:flex-start;gap:12px">
          ${clk}
          <div style="flex:1;min-width:0;font-size:15px;color:#222;line-height:1.4">${esc(s.query)}</div>
          ${s.time ? `<span style="color:#bbb;font-size:12px;flex-shrink:0;margin-top:2px">${esc(s.time)}</span>` : ''}
        </div>
        ${String(open) === String(i) ? `<div style="margin:8px 0 0 32px;font-size:13px;color:#1e3a8a;line-height:1.65">${esc(s.inner || '(没记下当时在想什么)')}</div>` : ''}
      </div>`).join('');
    return `${cpTopbar('', 'cp-home', '#f2f2f7', 'cp-refresh')}<div class="xhs-scroll" style="background:#f2f2f7">${googleLogo}${searchBar}${histHeader}${rows || '<div class="xhs-empty">没有搜索记录,回上一页点 🔄</div>'}<div style="height:30px"></div></div>`;
  }
  function renderCharPhoneMusic(d) {
    const m = d.charPhoneMusic;
    const topbar = `<div class="xhs-topbar"><button class="xhs-icon-btn" data-action="cp-back" data-route="cp-home">‹</button><span class="xhs-topbar-title">网易云音乐</span><button class="xhs-icon-btn" data-action="cp-music-refresh" title="重新生成">↻</button></div>`;
    const tab = d.routeContext.musicTab || 'rec';
    const mtab = (label, key, n) => `<div data-action="cp-music-tab" data-cat="${key}" style="flex:1;text-align:center;padding:11px 0;cursor:pointer;font-size:14px;color:${tab === key ? '#ec4141' : '#666'};font-weight:${tab === key ? '700' : '400'};border-top:2px solid ${tab === key ? '#ec4141' : 'transparent'}">${label}${n ? ` ${n}` : ''}</div>`;
    const cmtCount = m ? (m.songs || []).filter(s => s.comment).length : 0;
    const tabbar = `<div style="display:flex;background:#fff;border-top:1px solid #eee;flex-shrink:0">${mtab('记录', 'rec')}${mtab('评论', 'comment', cmtCount)}</div>`;
    if (!m) return topbar + `<div class="xhs-scroll" style="background:#fafafa"><div class="xhs-empty">生成中…(没动静就点右上角 ↻)</div></div>` + tabbar;
    const cname = charDisplayName(d);
    const fmtLike = (n) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
    const dft = new Date(m.genAt || Date.now()).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    let body;
    if (tab === 'comment') {
      const cards = (m.songs || []).filter(s => s.comment).map(s => `
        <div style="padding:14px 16px;border-bottom:1px solid #f2f2f2;display:flex;gap:10px;background:#fff">
          ${cpCharAvatar(d, 34)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:#9aa3ad">${esc(cname)}</div>
            <div style="font-size:14.5px;color:#222;line-height:1.6;margin-top:5px">${esc(s.comment)}</div>
            <div style="margin-top:8px;background:#f6f6f6;border-radius:6px;padding:7px 10px;font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🎵 ${esc(s.title)} - ${esc(s.artist)}</div>
            <div style="font-size:11px;color:#c2c2c2;margin-top:7px">${esc(s.date || dft)}</div>
          </div>
          <div style="text-align:center;color:#b6b6b6;flex-shrink:0;font-size:11px"><div style="font-size:15px;line-height:1">♡</div>${fmtLike(s.likes || 0)}</div>
        </div>`).join('');
      body = `<div style="font-size:14px;font-weight:700;color:#333;padding:12px 16px 6px">ta 的评论</div>${cards || '<div class="xhs-empty">还没有评论</div>'}`;
    } else {
      const rows = (m.songs || []).map((s, i) => `
        <div style="padding:11px 16px;border-bottom:1px solid #f2f2f2;display:flex;align-items:center;gap:12px">
          <span style="color:#ec4141;font-size:15px;font-weight:600;width:20px;flex-shrink:0;text-align:center">${i + 1}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.title)}</div>
            <div style="font-size:12px;color:#aaa;margin-top:2px">${esc(s.artist)}${s.comment ? ' · 写过评论' : ''}</div>
          </div>
          <span style="font-size:11.5px;color:#bbb;flex-shrink:0">循环 ${s.loops || 0} 次</span>
        </div>`).join('');
      body = `<div style="font-size:14px;font-weight:700;color:#333;padding:12px 16px 6px">最近播放</div>${rows || '<div class="xhs-empty">没有播放记录</div>'}`;
    }
    return topbar + `<div class="xhs-scroll" style="background:#fff">${body}<div style="height:20px"></div></div>` + tabbar;
  }
  function renderCharPhoneTaobao(d) {
    const t = d.charPhoneTaobao;
    const back = `<div data-action="cp-back" data-route="cp-home" style="position:absolute;top:10px;left:8px;z-index:4;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;cursor:pointer">‹</div>`;
    const refresh = `<div data-action="cp-tb-refresh" title="重新生成" style="position:absolute;top:13px;right:14px;z-index:4;cursor:pointer"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><polyline points="20.5 3.5 20.5 8 16 8"/></svg></div>`;
    if (!t) return `<div class="xhs-scroll" style="background:#f4f4f4;position:relative">${back}${refresh}<div class="xhs-empty">生成中…(没动静就点右上角 ↻)</div></div>` + cpTbTabs('my');
    const cname = charDisplayName(d);
    const oc = (st) => (t.orders || []).filter(o => o.status === st).length;
    const orderItem = (kind, label, st) => { const n = oc(st); return `<div data-action="cp-tb-orders" data-cat="${st}" style="flex:1;text-align:center;position:relative;cursor:pointer"><div style="display:flex;justify-content:center">${tbOrderIcon(kind)}</div><div style="font-size:11px;color:#444;margin-top:5px">${label}</div>${n ? `<span style="position:absolute;top:-3px;left:calc(50% + 6px);background:#ff5000;color:#fff;font-size:9px;min-width:15px;height:15px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">${n}</span>` : ''}</div>`; };
    return `<div class="xhs-scroll" style="background:#f4f4f4">
      <div style="position:relative;background:linear-gradient(160deg,#ffb07a,#ff7a45);padding:46px 16px 16px">${back}${refresh}
        <div style="display:flex;align-items:center;gap:12px">${cpCharAvatar(d, 50)}<div style="flex:1;min-width:0;color:#fff"><div style="font-size:18px;font-weight:700">${esc(cname)}</div>${t.vip ? `<span style="display:inline-block;margin-top:4px;background:rgba(0,0,0,.22);color:#ffe7c2;font-size:11px;padding:2px 9px;border-radius:9px">${esc(t.vip)}</span>` : ''}</div></div>
      </div>
      <div style="margin:-10px 12px 0;background:#fff;border-radius:12px;padding:11px 14px;font-size:13px;color:#333">累计省钱 <b style="color:#ff5000">${cpYuan(t.saved)}</b> 元</div>
      <div style="margin:10px 12px 0;background:#fff;border-radius:12px;padding:14px 8px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin:0 6px 14px"><span style="font-size:15px;font-weight:700;color:#222">我的订单</span><span data-action="cp-tb-orders" style="font-size:12px;color:#999;cursor:pointer">查看全部 ›</span></div>
        <div style="display:flex">${orderItem('pay', '待付款', 'topay')}${orderItem('ship', '待发货', 'toship')}${orderItem('recv', '待收货', 'torecv')}${orderItem('rate', '已评价', 'reviewed')}${orderItem('refund', '退款/售后', 'refund')}</div>
      </div>
      <div style="height:24px"></div>
    </div>` + cpTbTabs('my');
  }
  function renderCharPhoneTbCart(d) {
    const t = d.charPhoneTaobao || { cart: [] };
    const cart = t.cart || [];
    let html = '', lastKey = null, total = 0;
    cart.forEach(it => {
      total += (it.price || 0) * (it.qty || 1);
      const key = it.mall + '|' + it.shop;
      if (key !== lastKey) { lastKey = key; html += `<div style="height:8px;background:#f4f4f4"></div><div style="display:flex;align-items:center;gap:7px;padding:12px 14px 4px;background:#fff"><span style="width:18px;height:18px;border:1.5px solid #ddd;border-radius:50%;flex-shrink:0"></span>${cpMallTag(it.mall)}<span style="font-size:14px;font-weight:600;color:#222">${esc(it.shop || '店铺')} ›</span></div>`; }
      const tags = ['官方立减', '退货宝', '7天无理由'].map(tg => `<span style="font-size:10.5px;color:#ff5000;border:1px solid #ffd6c2;border-radius:3px;padding:1px 4px">${tg}</span>`).join('');
      html += `<div style="display:flex;gap:10px;padding:8px 14px 12px;background:#fff"><span style="width:18px;height:18px;border:1.5px solid #ddd;border-radius:50%;flex-shrink:0;margin-top:30px"></span><div style="width:80px;height:80px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0">🛍️</div><div style="flex:1;min-width:0"><div style="font-size:14px;color:#222;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(it.title)}</div>${it.spec ? `<div style="display:inline-block;font-size:11px;color:#888;background:#f3f3f3;border-radius:10px;padding:2px 8px;margin-top:5px">${esc(it.spec)} ›</div>` : ''}<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${tags}</div><div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:7px"><div><span style="font-size:11px;color:#888">店铺优惠后 </span><span style="color:#ff5000;font-size:17px;font-weight:700">¥${cpYuan(it.price)}</span>${it.origPrice > it.price ? `<span style="font-size:12px;color:#bbb;text-decoration:line-through;margin-left:4px">¥${cpYuan(it.origPrice)}</span>` : ''}</div><span style="color:#999;font-size:13px">×${it.qty || 1}</span></div></div></div>`;
    });
    const bar = cart.length ? `<div style="display:flex;align-items:center;padding:10px 14px;background:#fff;border-top:1px solid #eee;flex-shrink:0"><span style="width:18px;height:18px;border:1.5px solid #ddd;border-radius:50%;margin-right:6px"></span><span style="font-size:13px;color:#333">全选</span><div style="margin-left:auto;font-size:13px;color:#333;margin-right:10px">合计 <b style="color:#ff5000;font-size:16px">¥${cpYuan(total)}</b></div><div style="background:#ff5000;color:#fff;border-radius:18px;padding:8px 22px;font-size:14px">结算(${cart.length})</div></div>` : '';
    return cpTopbar(`购物车(${cart.length})`, 'cp-taobao') + `<div class="xhs-scroll" style="background:#f4f4f4">${html || '<div class="xhs-empty">购物车是空的</div>'}<div style="height:8px;background:#f4f4f4"></div></div>${bar}${cpTbTabs('cart')}`;
  }
  function renderCharPhoneTbOrders(d) {
    const t = d.charPhoneTaobao || { orders: [] };
    const st = d.routeContext.tbStatus || '';
    const labels = { topay: '待付款', toship: '待发货', torecv: '待收货', reviewed: '已评价', refund: '退款/售后' };
    const stText = { topay: '等待付款', toship: '等待发货', torecv: '卖家已发货', reviewed: '交易成功', refund: '退款/售后中' };
    const list = st ? (t.orders || []).filter(o => o.status === st) : (t.orders || []);
    const rows = list.map(o => {
      const extra = (o.status === 'reviewed' && o.review) ? `<div style="margin-top:9px;background:#faf7f2;border-radius:8px;padding:9px 11px;font-size:13px;color:#555;line-height:1.55"><span style="color:#ff8800">★★★★★</span> ${esc(o.review)}</div>`
        : ((o.status === 'refund' && o.complaint) ? `<div style="margin-top:9px;background:#fff4f4;border-radius:8px;padding:9px 11px;font-size:13px;color:#c0392b;line-height:1.55">退货原因:${esc(o.complaint)}</div>` : '');
      return `<div style="background:#fff;padding:12px 14px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px"><span style="font-size:13px;color:#333">${cpMallTag(o.mall)} ${esc(o.shop || '店铺')}</span><span style="font-size:12px;color:${o.status === 'reviewed' ? '#999' : '#ff5000'}">${stText[o.status] || ''}</span></div><div style="display:flex;gap:10px"><div style="width:60px;height:60px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🛍️</div><div style="flex:1;min-width:0"><div style="font-size:14px;color:#222;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(o.title)}</div>${o.spec ? `<div style="font-size:11px;color:#999;margin-top:4px">${esc(o.spec)}</div>` : ''}</div><div style="text-align:right;flex-shrink:0"><div style="color:#222;font-size:14px;font-weight:600">¥${cpYuan(o.price)}</div>${o.date ? `<div style="font-size:11px;color:#bbb;margin-top:4px">${esc(o.date)}</div>` : ''}</div></div>${extra}</div>`;
    }).join('');
    return cpTopbar(st ? labels[st] : '我的订单', 'cp-taobao') + `<div class="xhs-scroll" style="background:#f4f4f4"><div style="height:8px"></div>${rows || `<div class="xhs-empty">没有${st ? labels[st] : ''}订单</div>`}</div>`;
  }
  function renderCharPhoneAlipay(d) {
    const a = d.charPhoneAlipay;
    const back = `<div data-action="cp-back" data-route="cp-home" style="position:absolute;top:10px;left:8px;z-index:4;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#33526e;font-size:26px;cursor:pointer">‹</div>`;
    const refresh = `<div data-action="cp-ali-refresh" title="重新生成" style="position:absolute;top:13px;right:14px;z-index:4;cursor:pointer"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#33526e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><polyline points="20.5 3.5 20.5 8 16 8"/></svg></div>`;
    if (!a) return `<div class="xhs-scroll" style="background:#eef3fa;position:relative">${back}${refresh}<div class="xhs-empty">生成中…(没动静就点右上角 ↻)</div></div>` + cpAliTabs('my');
    const cname = charDisplayName(d);
    const sep = `<div style="height:1px;background:#f3f3f3;margin-left:54px"></div>`;
    const row = (icon, label, badge, right, route, dot) => `<div ${route ? `data-action="cp-open" data-route="${route}"` : ''} style="display:flex;align-items:center;gap:11px;padding:11px 14px;cursor:${route ? 'pointer' : 'default'}">${aliIcon(icon)}<span style="font-size:14px;color:#1a1a1a;font-weight:500;white-space:nowrap">${label}</span>${badge ? `<span style="background:#eaf1ff;color:#2f7bff;font-size:10px;padding:1px 6px;border-radius:6px;white-space:nowrap">${badge}</span>` : ''}<span style="flex:1"></span><span style="font-size:12px;color:#9aa6b2;margin-right:5px;white-space:nowrap">${right || ''}</span>${dot ? '<span style="width:7px;height:7px;border-radius:50%;background:#ff3b30;margin-right:5px"></span>' : ''}<span style="color:#cfd6de;font-size:13px">›</span></div>`;
    const hb = a.huabei || {}; const owed = hb.owed || 0;
    return `<div class="xhs-scroll" style="background:#eef3fa">
      <div style="position:relative;background:linear-gradient(180deg,#cfe0f5,#eef3fa);padding:42px 14px 12px">${back}${refresh}
        <div style="display:flex;align-items:center;gap:11px"><div style="width:46px;height:46px;border-radius:11px;overflow:hidden;flex-shrink:0">${cpCharAvatar(d, 46)}</div><div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:700;color:#1a2b3c">${esc(cname)}</div><div style="margin-top:5px"><span style="background:rgba(22,119,255,.1);color:#1677ff;font-size:10.5px;padding:2px 8px;border-radius:8px">📇 证件 ›</span></div></div><span style="color:#9bb">›</span></div>
      </div>
      <div style="margin:6px 12px 0;background:#fff;border-radius:14px">${row('vip', '支付宝会员', '大众会员', '', '')}${sep}${row('shop', '商家服务', '', '', '')}</div>
      <div style="margin:10px 12px 0;background:#fff;border-radius:14px">${row('bill', '账单', '', '', 'cp-ali-bills')}</div>
      <div style="margin:10px 12px 0;background:#fff;border-radius:14px">${row('asset', '总资产', '', '查看账户余额', 'cp-ali-assets')}${sep}${row('huabei', '花呗', '', owed > 0 ? '待还 ¥' + cpYuan(owed) : '¥0', 'cp-ali-huabei', owed > 0)}</div>
      <div style="height:20px"></div>
    </div>` + cpAliTabs('my');
  }
  function renderCharPhoneAliAssets(d) {
    const a = d.charPhoneAlipay || { balance: 0, yuebao: 0, banks: [] };
    const total = (a.balance || 0) + (a.yuebao || 0) + (a.banks || []).reduce((s, b) => s + (b.amount || 0), 0);
    const line = (label, val) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid #f3f3f3"><span style="font-size:13.5px;color:#333">${label}</span><span style="font-size:14.5px;color:#222;font-weight:600">¥${cpYuan(val)}</span></div>`;
    const banks = (a.banks || []).map(b => `<div style="display:flex;align-items:center;gap:11px;padding:14px 16px;border-top:1px solid #f3f3f3">${aliIcon('balance')}<span style="flex:1;min-width:0;font-size:13.5px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.name)}</span><span style="font-size:14.5px;color:#222;font-weight:600;flex-shrink:0">¥${cpYuan(b.amount)}</span></div>`).join('');
    return cpTopbar('总资产', 'cp-alipay') + `<div class="xhs-scroll" style="background:#f4f4f4">
      <div style="background:linear-gradient(160deg,#3d8bff,#1677ff);padding:18px 16px 22px;color:#fff"><div style="font-size:13px;opacity:.9">总资产(元)</div><div style="font-size:29px;font-weight:700;margin-top:4px">${cpYuan(total)}</div></div>
      <div style="margin:-14px 12px 0;background:#fff;border-radius:12px;overflow:hidden"><div style="padding:11px 16px 0;font-size:13px;color:#999">我的账户</div>${line('余额', a.balance)}${line('余额宝', a.yuebao)}</div>
      ${(a.banks || []).length ? `<div style="margin:10px 12px 0;background:#fff;border-radius:12px;overflow:hidden"><div style="padding:11px 16px 4px;font-size:13px;color:#999">银行卡</div>${banks}</div>` : ''}
      <div style="height:24px"></div>
    </div>`;
  }
  function renderCharPhoneAliHuabei(d) {
    const a = d.charPhoneAlipay || {};
    const h = a.huabei || { owed: 0, repaid: 0, limit: 0, note: '' };
    const line = (label, val) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-top:1px solid #f3f3f3"><span style="font-size:13.5px;color:#333">${label}</span><span style="font-size:14.5px;color:#222;font-weight:600">¥${cpYuan(val)}</span></div>`;
    return cpTopbar('花呗', 'cp-alipay') + `<div class="xhs-scroll" style="background:#f4f4f4">
      <div style="background:linear-gradient(160deg,#4d9bff,#1f8fff);padding:18px 16px 22px;color:#fff"><div style="font-size:13px;opacity:.9">待还(元)</div><div style="font-size:29px;font-weight:700;margin-top:4px">${cpYuan(h.owed)}</div></div>
      <div style="margin:-14px 12px 0;background:#fff;border-radius:12px;overflow:hidden"><div style="padding:11px 16px 0;font-size:13px;color:#999">花呗</div>${line('本期已还', h.repaid)}${line('可用额度', h.limit)}</div>
      <div style="height:24px"></div>
    </div>`;
  }
  function renderCharPhoneAliBills(d) {
    const a = d.charPhoneAlipay || { bills: [] };
    const bills = a.bills || [];
    const cat = d.routeContext.aliCat || '全部';
    const seen = [], catList = ['全部'];
    bills.forEach(b => { if (b.cat && seen.indexOf(b.cat) < 0) { seen.push(b.cat); catList.push(b.cat); } });
    const out = bills.filter(b => b.type === 'out').reduce((s, b) => s + (b.amount || 0), 0);
    const inc = bills.filter(b => b.type === 'in').reduce((s, b) => s + (b.amount || 0), 0);
    const list = cat === '全部' ? bills : bills.filter(b => b.cat === cat);
    const tabs = catList.map(c => `<span data-action="cp-ali-cat" data-cat="${esc(c)}" style="flex-shrink:0;padding:5px 13px;border-radius:14px;font-size:12.5px;cursor:pointer;${c === cat ? 'background:#1677ff;color:#fff' : 'background:#f0f0f0;color:#555'}">${esc(c)}</span>`).join('');
    const rows = list.map(b => {
      const o = b.type !== 'in';
      const sub = [b.note, b.time].filter(Boolean).join(' · ');
      return `<div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid #f2f2f2;background:#fff"><div style="width:33px;height:33px;border-radius:50%;background:#eef3ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${cpBillIcon(b.title + b.note + b.cat)}</div><div style="flex:1;min-width:0"><div style="font-size:13.5px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title)}</div>${sub ? `<div style="font-size:11.5px;color:#aaa;margin-top:2px">${esc(sub)}</div>` : ''}</div><div style="font-size:15px;font-weight:600;flex-shrink:0;color:${o ? '#222' : '#19be6b'}">${o ? '-' : '+'}${cpYuan(b.amount)}</div></div>`;
    }).join('');
    return cpTopbar('账单', 'cp-alipay') + `<div class="xhs-scroll" style="background:#f4f4f4">
      <div style="background:#fff;padding:15px 16px;display:flex;justify-content:space-around;text-align:center"><div><div style="font-size:18px;font-weight:700;color:#222">${cpYuan(out)}</div><div style="font-size:12px;color:#999;margin-top:3px">本月支出</div></div><div style="width:1px;background:#eee"></div><div><div style="font-size:18px;font-weight:700;color:#19be6b">${cpYuan(inc)}</div><div style="font-size:12px;color:#999;margin-top:3px">本月收入</div></div></div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding:10px 12px;background:#fff;border-top:1px solid #f4f4f4">${tabs}</div>
      ${rows || '<div class="xhs-empty">没有账单</div>'}
      <div style="height:20px"></div>
    </div>`;
  }

  function renderCharPhoneDoubao(d) {
    const db = d.charPhoneDoubao;
    const ico = (p) => `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#666" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const phone = ico('<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 3.5z"/>');
    const refr = `<div data-action="cp-doubao-refresh" title="重新生成" style="width:30px;display:flex;justify-content:center;cursor:pointer"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#666" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><polyline points="20.5 3.5 20.5 8 16 8"/></svg></div>`;
    const top = `<div style="display:flex;align-items:center;padding:8px 8px;background:#fff;border-bottom:1px solid #f0f0f0;flex-shrink:0"><div data-action="cp-back" data-route="cp-home" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#333;font-size:25px;cursor:pointer">‹</div><div style="flex:1;text-align:center"><div style="font-size:16px;font-weight:600;color:#1a1a1a">豆包 ›</div><div style="font-size:10.5px;color:#bbb;margin-top:1px">内容由 AI 生成</div></div><div style="width:30px;display:flex;justify-content:center">${phone}</div>${refr}</div>`;
    const inputBar = `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border-top:1px solid #f0f0f0;flex-shrink:0"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="#444" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13" rx="2.5"/><circle cx="12" cy="13" r="3.2"/><path d="M8 6.5l1.2-2h5.6l1.2 2"/></svg><div style="flex:1;background:#f3f4f6;border-radius:18px;padding:9px 14px;font-size:13px;color:#aaa">发消息或按住说话…</div><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#444" stroke-width="1.6" stroke-linecap="round"><path d="M9 5v14M15 5v14M5 9v6M19 9v6M12 3v18"/></svg><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#444" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg></div>`;
    if (!db || !(db.msgs || []).length) return top + `<div class="xhs-scroll" style="background:#f4f5f7"><div class="xhs-empty">生成中…(没动静就点右上角 ↻)</div></div>` + inputBar;
    const bubbles = db.msgs.map(m => {
      if (m.from === 'ai') return `<div style="display:flex;margin:11px 0;padding-right:36px"><div style="background:#fff;color:#1a1a1a;border-radius:3px 16px 16px 16px;padding:11px 13px;font-size:14.5px;line-height:1.6;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,.04)">${esc(m.text)}</div></div>`;
      return `<div style="display:flex;justify-content:flex-end;margin:11px 0;padding-left:36px"><div style="background:#3b8bff;color:#fff;border-radius:16px 3px 16px 16px;padding:11px 13px;font-size:14.5px;line-height:1.6;white-space:pre-wrap">${esc(m.text)}</div></div>`;
    }).join('');
    return top + `<div class="xhs-scroll" style="background:#f4f5f7;padding:8px 14px 14px">${bubbles}</div>` + inputBar;
  }

  const POOP_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAAAaWUlEQVR42u3deXxV5ZkH8N/znnPuktybhCQkZAFZAyZFQ0CtCCZxUBbRovbGpXWpWqfW0qHtVJx+qjd0ZrRT2+pU0Wo3O2pbE7dBVIaP1USrgOyQhUW2LEDIntz9nPM+88e9idEqiqMMCe/388knIZDLzXue87zv+5z3vAdQFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFOX/CTNTVVWVVlpaqpeWlup+v19nZlIto3yh/H6/KC0t1Y/396qVTpw6cz9FxiMiAODEn1MeeOCBL+/fv7/YMDSXy5UUvP322/8wbty4Lr/fL1asWCFVqymfW9YDACEEtr377ox/Wrr0noULFxwomVHMUwsKeMqUAp46bRovWryo5emnn56X+BldtZzyuQUfM6ff8s1v/qm8vJwLCgp4dFY2e1NS7MyMDHNMTo6Zl5cXy87O5vnz5/dv2bKlEACqqqo01YLKZzYQQOvXry/86le/untKwVROS0uTmaPSzLOLzjSvr1jCK396Dz//xEN8zeXzOcPrscaOHcsLFy3c88ILL4xVY8JPT52pHxF8FRUV9r59+8bdd999f3377XcmBvu6rAm5mdo1Vyygf7rtOuu8GZP1/MwkpLkFZhQXIRSOioY9++zO7u5MacvS559/ctWrr/41MnPmTG3ixInU0NCgGlYF4Ce77bbbjLvuust69tlnz7j//p/VrFu3fnwsFLCnTszRf/idGzC7eAqZoR49Fg7AjsUQi4ah6zamTivAtu0N4lDzYTM5OTnf4fDs/clPfrJx8+bNsqGhgQHA5/NpKhDVLPhjx3srVqwAAMnM6Tdef+NDtW+9dV0o0GWdNWWC/s/fuR6pbsCOxkBCi0+HEyxYMJwe7Nzdgv9+9Q07J28cXbbkyrv27D+wo7ej4+r8CRPf/va3l/6eiOI/5oNW5atCRUWFHJhZqwA8jUssFRUVorq62jYMA8uXL1++ZfPm77kc7uzGxjppICz+bfkyZI/SEYn0QRMu8EfEDENCd7oRsxlCaMjIzo/87MHfuDZtrUfKqNHIzs3fWlpW+qtly5Y9TUTmwM/5fD6tsLCQT+fSDZ3ugQcALfv2FfxL5T2Pbty89aIjLa2YMilfjs9PFxfNPgezzpyCcLAHQhdgFokG4w81ooRkhtA0sJRwutxYt6mef/v0Kru1o1fobo/IzRmLyVMm1mdkZGyae/7cZ75249deJ6Jo4iUExwuOrAJwhP++Pp9vMPCYOfW++376o7ffeecb27ZsGx0MBqwzxqRoX1l4Ac29YBZcugY7GoH2aZuJ4y3KLNnhTKIDR3rx5xdfxda6PbK3P8iupBTN6/UgLTUFE8ZPqi+ecfbOGdOn/+LSJVdsSgS18Pv9OJ0y4mkTgAOz24HAu/POO+/Yv3//0oaGXWO6uzrh1MkuKhin3eS7BBPHZiEUCkAyIEjDZ8lLzBIOpxNRS2DfoVas31yH+oYmuffgQY6YUUpK8orMrNEomn5WbFR66m8fffQ3lbputNu2BZ/Ppw2cJCoAR4CBA8rMjmXLlt2yc2fdj5qbm/K7errAtmWPTk0S37juCvryOdNg2BGYEQtCCIAIIMJn7RiZJQQBuuGApjnQH4hi3aad2LXvII62d8u9TUdkbyCi54/Nxxnjx/dMmjz5teuvv+EHs2bNagIgAEgVgMN8rFdWVqbV1tZaa9f+9fLHHnvEX1dXV9Lb2wczErBHZ3jEvAtnU+l5M5Az2gtpRgAGEtd+P4f/HzAMHUIIhMNB6LoDLlcyTClhSol3tzZi9Zq3uCcQkZ29/Zrb7UbOmJzu2XPm3vbT++9/tqSkxFi8eLE9krvkERuAQxcG3HfffTevXbv2d7saG2FGI3aqK1lcdOEMmlc6E+NysyGtMGzLAn0BzTEQzAwbzASWiaEiMdzuJLR392Hdpu3Y39LF727dJfsCAS0vPx/zLp7/2M9/+cC3mFllwOGY+YiImdnz4C9/+S9r1q790caNm6Qnyc3nn12gLSy/AIUFY2FaAZjRKIgI8fltvDm+iL5PQELS+80umGBLhqZrSEpKRltnEC/+z5t4teZtGYnZlJM7lkpKzvnF9Tde/2BeXl77lClTYiNxlkwjMPgEEcnVq1cXv/zyy79/8+03Z4R6A7YdDokrr1hAVy28ADpHEImEISAgPqK7JXzRFWL+QPOzLaE5XCDNiZqN2/CnZ1/iI+39nORJExeWzm196qmnLyWi7SNxuddIWzpERARm1pYsueKPe/fsOaurs80snjbJuGTOTMw4exLIDCJqRiCEAfEJ4XGyznvSBGwrCmlFcMmcYuSMTqMHf/00Nbf3xWpq3sy79trr7jEM46qR2FuNqGvBPp9Pq6+vR8XVVz+xZdPmS3o6j5kl0wuM7956Hc6cMAawIiBpgTQdIHFKpX8ighBALBRC3phMTJoyBbv37NNCwbDl9aYV3bH0u+/dddfyHT5fldbQUM0qAE8xVVVV2ooVK+zx48ffWFNbc09zS4s9cVyWvuwfr0NmioFoJAgiDYIEJAkwAafaiIogQEJHNBrBGWPzkOrxor5uF/cEQtQf7Jty4MCBX+/c+ZcRlQFHzJq1iooKMLN344YNN7S2tEqnQ8B32XyMy0xFLByGEDoYFJ+BMoMS5ZahH//v41cwAAlN09DX3Y5zi6di8qRxorW1FYFAsGDv3rpJAHgkrTUcEb8IMwsA9uuvvz79wKGm88KhIM0qmqSdd9YkhMIBCO39RD8wgqdTvLxBIGg6YWbJl2hsXq5sO9Lm+stfXpgNAEVFRaQC8BRSWVkpAGDDhg1jjx49kmRZpl00dSK8XjeklMNyqh+/rMxI9SYjHApwNBJCQ11dAQCsXLlSBeApedAsKyqlBECUnTUatm0lOt2hH++TUoKZBz+fcgdHAKFQEP39AdhSwqE7MkfaLHhElWFI150gwNAEWxKwbWYcp9ZJRNA0DcwMIoJtn1rX/yUDTBp0wyAGIHThBIDa2toRMwseKRlQAsDcuXPr3C43h8JhHZoD3vQssuTHRyAzw+12A8ApF3xghqbpkNBgW8waCfZ4PAQApaWlqgs+xcaADABz5sw5bBhGB2k6tjbs607Pyt/scrnBYDk06wkhEl2cQH9/PyzLOsXGfxKariFkEbbsrIfNTE63m9LS0xuHnDzk9/v14T4jHhFdcOIaqUZE3fPmzftbcnLqFe9s2Kq9XrsxfWqeB8FImDSNBrPewOeBrvdUKMG8P/tlsNBgiyQ8/scXsWnnHulwObT8/NyWH//4xw/ffffdKCsrk4nf2Rrux25Ynj0fdfb7fD4AoPLy8oeyszPsULA/5cFHHpqwr/kw3G4PYcgkQ0p5SgXdh8d9mm6g5u2NePPtLbAs4vETzjAvnDPnhwDCfr/fsWLFCtnR0ZGycuXKb/z5z38+c6BNhmXyGAEJUPP5fKiqqpKzZs3SN2/ebC5btsz/6ssvV3Z2HjGnT8o37rz9RqR5DJi2BSIBh8MB0zRPyUBkBnSngV8+/Af8bfMBmZyeLhZf/pXax379eFkkGhk4AUctXLiw9vDhw9Nnz5798uOPP774qquuGparqMVwy3yJz8lVVVXXrV279stEZFdXV9tExNu2bTNXrVo1p+lg84WmZbNmOLUdjfuwta4RDqcbzPFxn2VZp1zX+4GswMDC+RchZ0yK6O/r5rVrX5tz2Vcuf2XNmjWLt+3aNmHRokWvbN++fXpfXx80TXtOSoljx46pDHgyThhd1+W1115b1dDQ4MvIyLDy8/NXFRQUrFm+fPlLjz766Nznqp99pLFxV2Yo1MdfmnYGFU4ah8UXX4AMryu+6JTEB8owp179jyBZwnA70drWiz88/QI27dwLZ5IX0wqnIxKJBPbu3evxeDwoKSnZ9cwzz8wkovDg/EVNQr44Pp+PnnvuOaSmpvZHo1GsW7eOUlJSrty6deuVGzZs6G9pavY2Nx1CVkaKPau8RPMtvggZHjdsOwLLjAFEkFJCCPGBCcjA1593MDIATnTzJ5JtSWiIRcIYm+nF9775dTyz6q9YU/OOvX37dgGQx+V02FOnTt16++23X0FEoYEFuMNy/DSc3mx9fT38fj8tWrTotUOHDqUy88xIJCLa24/Zhw41uQJ9/XBQjP/xhivF1YsuAskw7FgEbHMit9Bg5vs0AcHMg10E46PvFeGBhdR/98EgQUhyu+OFFduO3+SE9xe80nFmwkQaLMuCwyCcU1IMEpqo370bELqdn5+v3XzzzbcvWbJkk9/v18vLy4ftItVhlQGHnOVBAN+pqalZuXHjxu899dRTtx492mYbsMUN11xFs2dOR6inAyQYJERiZ8lPzlckBiIKkJKh6xqgGfGAhUQsEv1AEErJ4MRbGvg+EYERLyJHojZ21NUhf2w2Mkelg80YBAEMgiYE4pcNj58JbduGDHfi6iVlMO0QVa+uoaNtR2nNmjXf1XX9pYG9Z1QZ5iTH4oIFC5xlZWWNwWCwnhkUi0b4y+dOp4UXz4YZCUAIAgsRv5w1pGv9uMzHYERjYYQiQUSiYRCAYNjCf1Wvwc9WPoW6XYdgOByDr0UAktxOeD0eJCclwel0wGEYiUYlmDbwx6o1uO8//4T7f/UXtHf0IRqJINDTjb7eXkRCoeMGIDEDzINLyCKBLlz31UtRclah6OvusQ8fPnz+z3/+869XV1fbw3k/wmFZiE6M2WJ79uzJX7p0aeWRI4eRm52mXXn5RZDRfoBtSKLjdnOD000wwEAo0I+YGY7flsmAI1Vgw+Y6vLTmLURsgf7eXqy489uDr2eDsH57Iw42tSA7OweZ6aPg0hn5udkgAcQiMeysb4RFTrzXfAQ76uoxu7gAMTMKEhpCdhROOxlJyR5I8Ee+TwIgiEBCh21bkGYEl/7DhbRjxwHa1bg7+VXHK//BzC8M53HgsAzAyspKAiBra2u9gf5AmhkOY/qUQho3Og12sB+kaYmFp5/c7TIYZsyEZUYhKB4IzBIxKwRTRsBkgaAjJSUlPmRmhuHQsb+lCw/9tgodPSE4XckwdA0FZ2Rh+bJb4YQJT5IT1y5ZiJfW1CInLwMFk86AZcZAAhBCxpeeSvsTSxEEgCVD0wzEwlEUnzkO5xYXijfe3WG3Hj6cu+z73/8BM/9bRUUFAbBVAJ68oYMMBoOXmZEIp6Yk2+UXXaATLLB2YrUlAsGyLDDz4HiEhIAZiaB46kTc9vUl6AuYKJ97HhJ3rUNaNkZnpGLa5Mmo39MEyQQpY8jLy4EmNDBM2JaJ0tklmH1OMSKxfsTCAbAZAUgCIGjQwJLBkj95IMQMljaICYItXHFpOXbsPiDa2o5y29GjPwDwq+rq6p7hmAWHZQDW1NQAAHZs25Z1rK2N8nJyMHXiBNiRLogTnNgTEUADM+T3b8iUEnA5dCy46HwYuhORUBCWFYEgAVvaSHYKLL3Fh2NdvYhGonA6CHk52dBhQjIAEohGQxCC4DQIsaA1uOsCQYCZEldiMFge+rjxafz7DCYNVowxNi8TuaPT0fNeL3V1dpgYxvf2DMsAzMrKYgBoam722JLh0A3IaAQaOD6L/bQpkAUAhsvlghWLgW0zPouVNjRNg8vtRTQSRVSGQTTkHmISsCyG2yEwOT8zPtOWjJgZA3Piv2eOBxczBBlIciUhHAoOFFkgieBwucCCPlAr/PhaJCW2gQM0MEaneUgDOBYJe1evXp0OoDMxNFEZ8ItWXV3NQgikpqSMJyJETZMsacMxUHI5oQkNQdN0uJLcMKMCRBIEBxwOFwynE7ZkQPz9voBEBMmMaCwRdHScGTYzHK4kkKbDtiyABDTDgNB0SJbxicanKIQTAMk2HIaAx5sEyzK5p6fbsW3bpmwAe1UGPLk1QcQsS4tGo5BSQrIEiMF84ju8sGQ4nC44nI4PbNBhSwmwwMfVrCn+RvBpLnIwCIbDBcMx5OYAliDQiV2FIQZIgoQEw2a3243x4yeMBobnzUrDsg5YWloqbNtGb09voyvJjfauLu7pCQwur/8M4QxIArEGQIAhIJmPWzc84dIRAMkMmViHGO+ixWCG/NTvNPEaUtqwiUkTGo/ypLYBQH19PasAPIlmFJ8tXS4XB8MhdPX1QdN1/F+2FWJOjAt54JLZFzu2P/GTJV7ZlBZgON3QNB0Eokg06lUZ8CQqKysDABSXlKwfNWoUhaMR2rRtJyAcQxbff6aOfcjXp97EUoKh6w50d/djZ10j6w6HcLvdPVddfXW9yoAnUWVlpQ1A3HTTTS9kZWW9m+T2inUbd8jG3Yfg9aQAtj0klOiEgi++VP/Uu3GdEO92HQ4n1m3agUOH22xPskfqhv4EEbWUlpbqw3HnrGEZgETEfr9fEFF01syS32WNzqaOnoj1+JPPYe+BIzBcbthSJuasny2QTrVUYkkJtycFR3tCeKV2PSxhsCfJI2bNOnfL0F5BBeBJsmLFCtvv94u7KyufLC4uOeh0ex17m46Zf3hmlewJRCEMDUwSUg4Z+A8jzEhcKYnX/lzedOw9dAwPPvYUjrb32+npGcYFF87du/iSS2oSq8akCsCTfIwS2TB88fz5NyxYcMm7qaMyjM3b6sS2nY3scCdDMuD2JMHldkI34jU3m+3EFeDPLR2fYAql405KBnZqEILgdDnhdLuhO11Y81oN/v0Xj2Dney02DKeWnpEZXLBw8eXnlpY2V1b6abhuXDnsb0oa2DWUmd133HHHkxQNzjivuHDi2ldeto92t4uCSZOpePqZSE91ID8nGxoJmGYUsK3B7DgYRPFVp4n6XmJ3luNs48YUX3r14eVeQ4Poww0dL2APvT00Pr5DYpcGQ9MAXUdPIITmljas37gTB1rb+L39B2XA0gXrLiqYPKmtvHTuLffee+/Lw/2RDiPiDvuBg6BpGizLcjz9+8e/9fDDj/5n4/4DEESWx+WgtGSHOG/WDDpz8gRMGD8GKcka3E4HDN2ALS1oJEBCIGaZkFZ8EiNtGQ+kxNKuD6c3ShS+B64hf7CgzIOtOzRI4zfGx2+OFyTimZkIps3o6e1Hd08/Nm1rxLtbG/lYZz/3BCNsMmlerxfZubly4qTJRxbMm3/FzTdfv7G0tFSvra0d1vcGj5gtHhIrQQQAWwiBH37/+4/WvvPOdV2dHSmBQAixSBRWLGK5XAalpXooNSWJJo0fh3H5eQRpc2b6KJIkUVQ4FQYzDF3A7TSgEcEyY/HrwPHUCLfbhVg0DLYtsJSwpYQ7vgMDLMuGtG1omg6GBs2hA0IgZsYAGe/8rZhEb38I4aiJ+sZdaO/qQXdPEHv3H+KuvgBHoqYk0nWhG3B7PMg/Y1zfjJLizeUXlt+9aNGiHUTUP1IeZjMSNymnxNULfuONN/LXrFnja2jYdVlb25HzmaXr2NFjiMZiMGMxOB06LMuSkydOFNFo1GrvOEbnnFOiHTncjBRPMufmjCFvshsZ6WloaWmGbVmck5NLkXAQbpcTo0dnIinJBQJgCA0x08KBpkOYduY0CKGhs6Mbnd1d8Hq9aGk+jHA4gt6ePu7u7kdHdx+FYxZ6+vqlGTUliEhohqY7daRnpMPj8ViZo7O2TymY+t+/+Nd//Z1z1KjDsVhs6HEbERsUjeQH1WhILNDUNA0vvvji2X09fResfW3tPzQ1NU2RUmaEg4ExuqaJUenp0uVyi4MHmqDrOg41NSEtbRTcTicfOdwic/PztL6+PhmLxYSU0s7KzmZIG51dnYhZYXI7XZyVMRpup4H2jg4AwJjsbLR3diASicIwHGRZEu0dHcQSwjAcMAwnJAgpqWnxCYfTwNj83EhuXt6eMTk5r08umPDHW2751rZoNDp4rPx+P1VWVo6ohxqO6Ccl+f1+UVNTI2pra+VAmUKI+M4I4XDY88YbbxQdO3LMe7D54JFx4/LLdjfuPn/V6pe/dqztmCwsLDximmaeRhqkZcPr8SIcDiFmmkhKTkZykhstzc1oPdIKp8OJsWPHgTQBMHBg/344DAO6riMzKwvJXg9M00Z7ezuSk919GlH0YNOhTClturC0dMe0M79U5fEkH7zpGt/f8idPPhQKhQaPj8/nE1VVVXKkPknztHlYYWIfmYHnbHxkyeKBBx6Y+sQTT+zq6upCeXn5tyoqKlo6j3WmdvV2NUSDwewUr7fXm5qev2fvnmlZ6ZlmX6B3+uHDbemBvkD9qKyMjLTUUcnRaKRx33t7dbfTmTll6hTPmJzcDcFgMJidlX20NxCMzZtXtvOdt965+OGVK5/s7OxARUXFHff+9N5Hhr6P0tJSvaysTJ4OT83UT5cA/HDgMTNVVlZSUVER1dfXEwA4nU6Pw+HgaDRKTqfzmsWLF5d/4hksBFieWJwsXbqMQ6EQbFuCiM72+/16V1eXlp6ebq5YsULW1tZatbW1p8VxOW0C8O/rx/T+srzEvRStra3tzz//fD8zp7S2tkIIgVtvvdXIycmxi4qKqLq6GoWFhYO9RkNDA1dXVw9uGJmVlcWFhYVUU1OD2tpa+Hw+Hvj3RUVFXF9fr1VWVprPPPNM27vr1tttbW3U3tGZ/bvf/8aybftjM7MKwNNEbm5uIBKJcG9vr4xGo+dv3Lhx1syZMzclHv/1sSWPj8tW1dXVH65Xgoh41apVQQZrUkokJye7Trfh0FBChV08G/p8Po2IugoKCn5WXFwsZs6c2TNt2jT6PAOjurpaMjNddtllWyYXTHpt3rx5LWcXz/gP27YH9jdUTmfMTIZhYPXq1eWbN2/OHfjeFzHxY2admdNUqyvHDciTNDs/bakx4EeoqqrS6uvrmYi+yEkBJbYYkarFFUVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRlGHrfwHXgUUvVIv16gAAAABJRU5ErkJggg==';
  function renderCharPhonePoop(d) {
    const p = d.charPhonePoop;
    const top = cpTopbar('打卡', 'cp-home', '#f7f1ea', 'cp-poop-refresh');
    if (!p) return top + `<div class="xhs-scroll" style="background:#faf6ef"><div class="xhs-empty">生成中…(没动静就点右上角 ↻)</div></div>`;
    const li = (pp) => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${pp}</svg>`;
    const clock = li('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 1.8"/>');
    const drop = li('<path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5z"/>');
    const flag = li('<path d="M6 3.5v17M6 5h11l-2 3 2 3H6"/>');
    const run = li('<circle cx="13" cy="5" r="1.6"/><path d="M6 21l3-5 3 2 1-4M9 16l-1-4 4-2 3 3 2 1"/>');
    const chip = (bg, c, inner) => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;border-radius:11px;padding:3px 9px;background:${bg};color:${c}">${inner}</span>`;
    const smoothSty = (s) => s === '通畅' ? ['#e7f6ec', '#1a9c4e'] : (s === '一般' ? ['#fdf3df', '#c78a12'] : ['#ffe9e6', '#d6492f']);
    const recs = (p.records || []).map(r => {
      const ss = smoothSty(r.smooth);
      return `
      <div style="margin:10px 12px 0;background:#fff;border-radius:12px;padding:13px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:14.5px;font-weight:700;color:#333">${esc(r.date)} <span style="font-weight:400;color:#b3b3b3;font-size:12px">${esc(r.time)}</span></span><span style="font-size:13px;letter-spacing:1px">${'⭐'.repeat(r.rating || 0)}</span></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">${chip('#f3ece0', '#8a7050', clock + esc(r.duration || '—'))}${chip(ss[0], ss[1], flag + esc(r.smooth))}${r.color ? chip('#f3ece0', '#8a7050', drop + esc(r.color)) : ''}${r.didWhat ? chip('#f3ece0', '#8a7050', run + '动作 ' + esc(r.didWhat)) : ''}</div>
        ${r.shape ? `<div style="margin-top:10px;font-size:13.5px;color:#444;line-height:1.5">📋 ${esc(r.shape)}</div>` : ''}
        ${r.comment ? `<div style="margin-top:8px;font-size:13px;color:#8a7050;background:#faf6ef;border-radius:8px;padding:8px 10px;line-height:1.5">"${esc(r.comment)}"</div>` : ''}
      </div>`;
    }).join('');
    const heroImg = `<img src="${POOP_IMG}" style="height:66px;object-fit:contain${p.todayPooped ? '' : ';opacity:.32;filter:grayscale(.5)'}"/>`;
    return top + `<div class="xhs-scroll" style="background:#faf6ef">
      <div style="background:linear-gradient(160deg,#c79a6b,#a9794d);padding:16px 16px 18px;color:#fff;text-align:center">
        <div style="height:66px;display:flex;align-items:center;justify-content:center">${heroImg}</div>
        <div style="font-size:17px;font-weight:700;margin-top:8px">${p.todayPooped ? '今天已打卡!' : '今天还没拉,加油 💪'}</div>
        <div style="font-size:12.5px;opacity:.92;margin-top:6px">🔥 已连续打卡 ${p.streak || 0} 天 · 最近 ${(p.records || []).length} 次记录</div>
      </div>
      ${p.tip ? `<div style="margin:10px 12px 0;background:#fff8ee;border:1px solid #f0e2cc;border-radius:10px;padding:10px 13px;font-size:13px;color:#9a7b4f;line-height:1.5">💡 健康小助手:${esc(p.tip)}</div>` : ''}
      ${recs || '<div class="xhs-empty">还没有记录</div>'}
      <div style="height:22px"></div>
    </div>`;
  }

  function renderWxChats(d) {
    const cname = getCharName();
    const list = wxList(d).slice().sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    const charDm = list.find(x => x.isChar);
    const others = list.filter(x => !x.isChar);
    const wxGroups = (d.groups || []).filter(g => g.app === 'wx');
    const row = (x) => {
      const nm = x.remark || (x.isChar ? cname : x.name);
      const last = x.messages.length ? x.messages[x.messages.length - 1] : null;
      return `
        <div class="wx-row" data-action="open-dm" data-id="${x.id}">
          <div class="wx-av">${avatarFor(d, x.isChar ? cname : x.name, { wx: true, url: x.avatar })}</div>
          <div class="wx-info">
            <div class="wx-row-top"><span class="wx-row-name">${esc(nm)}</span><span class="wx-row-time">${last ? fmtTime(x.lastTime || 0) : ''}</span></div>
            <div class="wx-row-prev">${last ? esc(msgPreview(last).slice(0, 30)) : (x.isChar ? '打个招呼吧～' : '')}</div>
          </div>
          ${x.unread ? '<span class="xhs-msg-dot"></span>' : ''}
        </div>`;
    };
    const groupRow = (g) => {
      const last = (g.chat || []).filter(m => m.text || m.kind).slice(-1)[0];
      const prev = last ? `${last.role === 'me' ? '' : (last.name ? last.name + ': ' : '')}${last.text || (last.kind === 'image' ? '[图片]' : last.kind === 'transfer' ? '[转账]' : last.kind === 'voice' ? '[语音]' : '')}` : '群聊已创建';
      return `
        <div class="wx-row" data-action="open-group" data-id="${g.id}">
          <div class="wx-av"${g.avatar ? '' : ' style="background:#5b8fb0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px"'}>${g.avatar ? `<img src="${esc(g.avatar)}" alt="群"/>` : '👥'}</div>
          <div class="wx-info">
            <div class="wx-row-top"><span class="wx-row-name">${esc(g.name)} (${(g.members || []).length + 1})</span><span class="wx-row-time">${last ? fmtTime(g.lastTime || 0) : ''}</span></div>
            <div class="wx-row-prev">${esc(prev).slice(0, 30)}</div>
          </div>
          ${groupUnread(g) ? '<span class="xhs-msg-dot"></span>' : ''}
        </div>`;
    };
    const items = [
      ...others.map(x => ({ html: row(x), t: x.lastTime || 0 })),
      ...wxGroups.map(g => ({ html: groupRow(g), t: g.lastTime || 0 })),
    ].sort((a, b) => b.t - a.t);
    let rows = (charDm ? row(charDm) : '') + items.map(it => it.html).join('');
    const addMenuOpen = d.routeContext.wxAddMenuOpen;
    return `
      <div class="xhs-topbar wx-topbar">
        <button class="xhs-icon-btn" data-action="go-home"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span style="font-weight:600">微信</span>
        <button class="xhs-icon-btn" data-action="wx-add-menu" title="更多"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      </div>
      ${addMenuOpen ? `<div class="wx-add-menu">
        <button data-action="wx-add"><span class="wx-add-ic">👤</span> 添加好友</button>
        <button data-action="wx-new-group"><span class="wx-add-ic">👥</span> 发起群聊</button>
      </div>` : ''}
      <div class="xhs-scroll" style="background:#ededed">
        ${rows || '<div class="xhs-empty">还没有聊天<br/>点右上 + 加好友或发起群聊</div>'}
        <div style="height:60px"></div>
      </div>
      ${wxNav('wx-chats')}`;
  }
  async function wxAddContact() {
    const TOP = getTop();
    const name = TOP.prompt('好友昵称(可直接填世界书里的 NPC 名字,会自动认):', '');
    if (name === null || !name.trim()) return;
    const persona = TOP.prompt('这个人是谁 / 什么性格?(留空=自动从世界书/人设里认)', '') || '';
    const d = loadData();
    d.dms = d.dms || [];
    const dm = { id: uid(), name: name.trim().slice(0, 20), persona: persona.trim(), app: 'wx', messages: [], lastTime: Date.now(), unread: false };
    d.dms.unshift(dm);
    await saveData(d);
    await openDm(dm.id);
  }

  function renderWxNewGroup(d) {
    const cname = getCharName();
    const contacts = wxList(d);
    const sel = d.routeContext.wxGroupSel || [];
    const rows = contacts.map(x => {
      const on = sel.includes(x.id);
      const nm = x.remark || (x.isChar ? cname : x.name);
      return `<div class="wx-row" data-action="wx-group-pick" data-id="${x.id}">
        <span class="wx-pick ${on ? 'wx-pick-on' : ''}">${on ? '✓' : ''}</span>
        <div class="wx-av">${avatarFor(d, x.isChar ? cname : x.name, { wx: true, url: x.avatar })}</div>
        <div class="wx-info"><div class="wx-row-name">${esc(nm)}</div></div>
      </div>`;
    }).join('');
    return `
      <div class="xhs-topbar wx-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="wx-chats"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span style="font-weight:600">发起群聊 (${sel.length})</span>
        <button class="xhs-icon-btn" data-action="wx-create-group" title="创建" style="font-size:20px">✓</button>
      </div>
      <div style="padding:11px 14px;background:#fff;border-bottom:1px solid #eee">
        <input id="xhs-wx-group-name" placeholder="群名称(可留空,自动命名)" maxlength="20" style="width:100%;border:none;outline:none;font-size:15px;background:transparent" value="${esc(readInputCache('xhs-wx-group-name') || '')}"/>
      </div>
      <div class="xhs-scroll" style="background:#fff">
        ${contacts.length ? `<div style="padding:9px 14px;color:#999;font-size:12px">选择要拉进群的好友(可多选)</div>${rows}` : '<div class="xhs-empty">通讯录还没有好友<br/>先去加好友</div>'}
        <div style="height:40px"></div>
      </div>`;
  }
  async function wxCreateGroup() {
    const d = loadData();
    const sel = d.routeContext.wxGroupSel || [];
    if (sel.length < 1) return toastr.warning('至少选一个好友');
    const cname = getCharName();
    const picked = (d.dms || []).filter(x => sel.includes(x.id));
    const members = picked.map(x => ({ name: x.isChar ? cname : x.name, persona: x.persona || '', avatar: x.avatar || '', isChar: !!x.isChar }));
    const myName = d.wxName || d.userName || '我';
    let name = (readInputCache('xhs-wx-group-name') || '').trim();
    if (!name) name = `${[myName, ...members.map(m => m.name)].slice(0, 3).join('、')}${members.length > 2 ? '等' : ''}的群聊`;
    const group = {
      id: uid(), app: 'wx', name: name.slice(0, 24),
      members, chat: [{ role: 'sys', text: '群聊创建成功,你邀请了 ' + members.map(m => m.name).join('、') + ' 加入群聊', time: Date.now() }],
      lastTime: Date.now(), seenAt: Date.now(),
    };
    d.groups = d.groups || [];
    d.groups.unshift(group);
    d.routeContext.wxGroupSel = [];
    d.currentApp = 'wx';
    clearInputCache('xhs-wx-group-name');
    await saveData(d);
    await navigate('group-chat', { groupId: group.id });
  }

  function wxMeName(d) { return d.wxName || d.userName || '我'; }
  function wxNav(active) {
    const d = loadData();
    const unread = wxUnread(d);
    const ICON = {
      chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h14a2.5 2.5 0 012.5 2.5v8A2.5 2.5 0 0119 17H9.5L5 21v-4A2.5 2.5 0 012.5 14.5v-8A2.5 2.5 0 015 4z"/></svg>',
      contacts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.1"/><path d="M3.2 19c.3-3.2 2.8-5 5.8-5s5.5 1.8 5.8 5"/><circle cx="17.3" cy="7" r="2.3"/><path d="M17 12c2.4.1 3.9 1.6 4 4"/></svg>',
      moments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5h2.6L8 6.5h8l1.4 2H20a1 1 0 011 1V18a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></svg>',
      me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.3"/><path d="M5 20c0-3.9 3.4-6 7-6s7 2.1 7 6"/></svg>',
    };
    const tab = (route, label, ic, badge) => `
      <button class="wx-tab ${active === route ? 'wx-tab-on' : ''}" data-action="nav" data-route="${route}">
        <span class="wx-tab-ic">${ic}${badge ? `<span class="wx-tab-dot">${badge > 99 ? '99+' : badge}</span>` : ''}</span>
        <span>${label}</span>
      </button>`;
    return `<div class="wx-nav">
      ${tab('wx-chats', '信息', ICON.chat, unread)}
      ${tab('wx-contacts', '通讯录', ICON.contacts, 0)}
      ${tab('wx-discover', '发现', ICON.moments, 0)}
      ${tab('wx-me', '我', ICON.me, 0)}
    </div>`;
  }
  function wxTopbar(title, addAction) {
    return `<div class="xhs-topbar wx-topbar">
      <button class="xhs-icon-btn" data-action="go-home"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <span style="font-weight:600">${title}</span>
      ${addAction ? `<button class="xhs-icon-btn" data-action="${addAction}" title="加好友"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></button>` : '<span style="width:32px"></span>'}
    </div>`;
  }

  function renderWxContacts(d) {
    const cname = getCharName();
    const list = wxList(d);
    const charDm = list.find(x => x.isChar);
    const others = list.filter(x => !x.isChar).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const row = (x) => {
      const nm = x.remark || (x.isChar ? cname : x.name);
      return `<div class="wx-row" data-action="open-dm" data-id="${x.id}">
        <div class="wx-av">${avatarFor(d, x.isChar ? cname : x.name, { wx: true, url: x.avatar })}</div>
        <div class="wx-info"><div class="wx-row-name">${esc(nm)}</div></div>
      </div>`;
    };
    const rows = (charDm ? row(charDm) : '') + others.map(row).join('');
    return `
      ${wxTopbar('通讯录', 'wx-add')}
      <div class="xhs-scroll" style="background:#fff">
        ${rows || '<div class="xhs-empty">还没有好友<br/>点右上角 + 添加</div>'}
        <div style="height:60px"></div>
      </div>
      ${wxNav('wx-contacts')}`;
  }

  function renderWxDiscover(d) {
    return `
      ${wxTopbar('发现', '')}
      <div class="xhs-scroll" style="background:#ededed">
        <div style="height:8px"></div>
        <div class="wx-row" style="opacity:.55;cursor:default"><div class="wx-av" style="background:#3b9eff">📷</div><div class="wx-info"><div class="wx-row-name">朋友圈</div><div class="wx-row-prev">敬请期待</div></div></div>
        <div style="height:50px"></div>
      </div>
      ${wxNav('wx-discover')}`;
  }

  function renderWxMe(d) {
    const nm = wxMeName(d);
    const av = avatarHtml(d.wxAvatar, d.avatarBg, (nm || '我')[0]);
    return `
      ${wxTopbar('我', '')}
      <div class="xhs-scroll" style="background:#ededed">
        <div class="wx-me-card">
          <div class="wx-me-av">${av}</div>
          <div class="wx-me-info">
            <div class="wx-me-name">${esc(nm)}</div>
            <div class="wx-me-bio">${esc(d.wxBio || '这个人很懒,什么都没留下')}</div>
          </div>
        </div>
        <div style="height:10px"></div>
        <div class="wx-row" data-action="set-wx-name"><div class="wx-info"><div class="wx-row-name">昵称</div></div><span class="wx-row-prev">${esc(nm)} ›</span></div>
        <div class="wx-row" data-action="set-wx-avatar"><div class="wx-info"><div class="wx-row-name">头像</div></div><span class="wx-row-prev">${d.wxAvatar ? '已设置' : '未设置'} ›</span></div>
        <div class="wx-row" data-action="set-wx-bio"><div class="wx-info"><div class="wx-row-name">个性签名</div></div><span class="wx-row-prev">${esc((d.wxBio || '未设置').slice(0, 12))} ›</span></div>
        <div style="height:60px"></div>
      </div>
      ${wxNav('wx-me')}`;
  }
  async function setWxName() {
    const TOP = getTop(); const d = loadData();
    const v = TOP.prompt('微信昵称:', d.wxName || d.userName || '');
    if (v === null) return; d.wxName = v.trim().slice(0, 20); await saveData(d); refreshXhs();
  }
  async function setWxAvatar() {
    const TOP = getTop(); const d = loadData();
    const v = TOP.prompt('微信头像图片 URL(留空=用首字母):', d.wxAvatar || '');
    if (v === null) return; d.wxAvatar = v.trim().slice(0, 500); await saveData(d); refreshXhs();
  }
  async function setWxBio() {
    const TOP = getTop(); const d = loadData();
    const v = TOP.prompt('个性签名:', d.wxBio || '');
    if (v === null) return; d.wxBio = v.trim().slice(0, 60); await saveData(d); refreshXhs();
  }

  // ============ 设置 App(全局:主页背景 / 气泡颜色 / 表情包 / API) ============
  const WALLPAPERS = [
    ['默认', 'linear-gradient(160deg,#8ec5fc,#e0c3fc)'],
    ['暮粉', 'linear-gradient(160deg,#ff9a9e,#fecfef)'],
    ['夜空', 'linear-gradient(160deg,#2b5876,#4e4376)'],
    ['森系', 'linear-gradient(160deg,#a8edea,#94e0b2)'],
    ['暖阳', 'linear-gradient(160deg,#f6d365,#fda085)'],
    ['极简灰', 'linear-gradient(160deg,#e6e6e6,#bdbdbd)'],
  ];
  function homeBgUrl(d) {
    const m = String(d.homeBg || '').match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : '';
  }
  function renderPhoneSettings(d) {
    const curBg = d.homeBg || WALLPAPERS[0][1];
    const swatches = WALLPAPERS.map(([nm, bg]) => `
      <button class="xhs-wall ${curBg === bg ? 'xhs-wall-on' : ''}" data-action="set-wallpaper" data-bg="${esc(bg)}" style="background:${bg}"><span>${nm}</span></button>`).join('');
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="go-home">‹</button>
        <span style="font-weight:600">设置</span>
        <button class="xhs-publish-btn" data-action="save-settings">保存</button>
      </div>
      <div class="xhs-scroll" style="padding:14px">
        <div class="xhs-set-hint">手机通用设置,小红书和微信都生效</div>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🎭 角色绑定(全局)</summary>
          <div class="xhs-set-help">把当前对话的 char 和世界书绑定过来,小红书和微信的所有 AI 生成都会用上</div>
          ${d.charBinding ? `
            <div style="background:#f0f8ff;padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px">
              <div><b>已绑定:</b>${esc(d.charBinding.name)}</div>
              <div style="color:#666;margin-top:2px">${d.charBinding.content.length} 字 · ${new Date(d.charBinding.syncedAt).toLocaleDateString()}</div>
            </div>
            <button class="xhs-set-btn" data-action="sync-char">🔄 重新同步</button>
            <button class="xhs-set-btn" data-action="clear-char" style="background:#bbb">✗ 清除</button>
          ` : `
            <button class="xhs-set-btn" data-action="sync-char">🔗 同步当前角色</button>
          `}
          <button class="xhs-set-btn" data-action="check-inject" style="background:#7c8aa0;margin-top:6px">🔍 自检:看读到多少人设/世界书</button>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🎭 出场角色(多人卡)</summary>
          <div class="xhs-set-help">单卡多角色用:登记卡里的几个角色,每个能在微信里单独建一条对话、各用各的人设生成、同步主线时写各自真名。<b>不登记角色的话,一切和原来一样(单 char),互不影响。</b></div>
          <button class="xhs-set-btn" data-action="detect-cast" style="background:#9b6dff">🔍 从角色卡自动识别</button>
          <button class="xhs-set-btn" data-action="add-cast" style="background:#5aa96b;margin-top:6px">＋ 手动加角色</button>
          ${(d.cast && d.cast.length) ? `<button class="xhs-set-btn" data-action="toggle-lurk-thoughts" style="background:${d.lurkThoughts ? '#9b6dff' : '#e8e8ee'};color:${d.lurkThoughts ? '#fff' : '#333'};margin-top:6px" title="开了之后,潜入粉丝群的角色会冒出'只有你看得到'的心声(上帝视角)">👁 偷听潜伏角色的心声:${d.lurkThoughts ? '开' : '关'}</button>` : ''}
          ${(d.castCandidates && d.castCandidates.length) ? `<div style="margin-top:10px;background:#fff7ed;border:1px solid #ffd9b3;border-radius:10px;padding:10px">
            <div style="font-weight:600;font-size:13px">识别到 ${d.castCandidates.length} 个候选 · 勾选要加入的</div>
            <div class="xhs-set-help" style="margin:2px 0 8px">主要角色已默认勾选;配角/NPC(教练、经纪人、路人等)默认没勾,想要再点。</div>
            <div style="display:flex;gap:6px;margin-bottom:8px">
              <button data-action="cand-all" style="font-size:12px;padding:4px 10px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">全选</button>
              <button data-action="cand-none" style="font-size:12px;padding:4px 10px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">全不选</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow:auto">${d.castCandidates.map((c, i) => `
              <div data-action="toggle-cand" data-idx="${i}" style="display:flex;gap:8px;align-items:flex-start;background:#fff;border-radius:8px;padding:7px 9px;cursor:pointer;border:1px solid ${c.sel ? '#ff9a3d' : '#eee'}">
                <div style="font-size:15px;line-height:1.3">${c.sel ? '☑' : '☐'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px">${esc(c.name)}</div>
                  <div style="color:#999;font-size:11px;max-height:30px;overflow:hidden">${esc((c.persona || '').slice(0, 56))}</div>
                </div>
              </div>`).join('')}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <button data-action="cand-add" style="flex:1;font-size:13px;padding:8px;border:none;border-radius:8px;background:#9b6dff;color:#fff;cursor:pointer">＋ 加入勾选的(${d.castCandidates.filter(c => c.sel).length})</button>
              <button data-action="cand-discard" style="font-size:13px;padding:8px 12px;border:none;border-radius:8px;background:#e8e8ee;cursor:pointer">丢弃</button>
            </div>
          </div>` : ''}
          ${(d.cast && d.cast.length) ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">${d.cast.map(c => `
            <div style="background:#f6f6f8;border-radius:8px;padding:8px">
              <div style="font-weight:600">${esc(c.name)}</div>
              <div style="color:#888;font-size:12px;margin:2px 0 6px;max-height:48px;overflow:hidden">${esc((c.persona || '(未设人设)').slice(0, 80))}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <button data-action="open-cast-wx" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#1aad19;color:#fff;cursor:pointer">💬 微信对话</button>
                <button data-action="open-cast-xhs" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#ff2442;color:#fff;cursor:pointer">📕 小红书私信</button>
                <button data-action="open-cast-profile" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#ff6b9d;color:#fff;cursor:pointer">🏠 小红书主页</button>
                <button data-action="edit-cast-persona" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">✏️ 人设</button>
                <button data-action="rename-cast" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">改名</button>
                <button data-action="set-cast-avatar" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">头像</button>
                <button data-action="toggle-cast-lurk" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:${c.lurk ? '#9b6dff' : '#e8e8ee'};color:${c.lurk ? '#fff' : '#333'};cursor:pointer" title="让 ta 用一个随机马甲偷偷潜进你的粉丝群暗中围观">${c.lurk ? '✓潜伏中' : '🫥潜入粉丝群'}</button>
                ${c.lurk ? `<button data-action="reveal-cast-lurk-name" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#f0ecff;color:#7a5af0;cursor:pointer" title="ta 在群里用的马甲名(群里别人只看到这个,你的上帝视角心声会标真名)">${(d.routeContext && d.routeContext.castLurkShown === c.id) ? '马甲:' + esc(c.lurkAlias || '(进群生成时定)') : '🔒 查看马甲名'}</button>` : ''}
                <button data-action="toggle-cast-panel" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:${(c.knows === 'unknown' || (d.dms || []).some(x => x.castAlt && x.castId === c.id)) ? '#ff7a45' : '#e8e8ee'};color:${(c.knows === 'unknown' || (d.dms || []).some(x => x.castAlt && x.castId === c.id)) ? '#fff' : '#333'};cursor:pointer" title="身份/悬念:ta 认不认识你、怀疑度、小号马甲">🎭 身份/悬念${c.knows === 'unknown' ? `·疑${c.susp || 0}` : ''} ${d.castPanelOpen === c.id ? '▴' : '▾'}</button>
                <button data-action="del-cast" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;color:#ff2442;cursor:pointer">删除</button>
              </div>
              ${d.castPanelOpen === c.id ? `<div style="margin-top:8px;background:#fff;border:1px solid #eee;border-radius:8px;padding:9px;display:flex;flex-direction:column;gap:8px">
                <div>
                  <div style="font-size:12px;color:#666;margin-bottom:4px">ta 知不知道"这个线上账号/对象就是你 {{user}}"?</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px">
                    <button data-action="toggle-cast-knows" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:${c.knows === 'unknown' ? '#ff7a45' : '#e8e8ee'};color:${c.knows === 'unknown' ? '#fff' : '#333'};cursor:pointer">${c.knows === 'unknown' ? `🕵️不认识你·疑${c.susp || 0}/100` : '🎭认识你'}</button>
                    ${c.knows === 'unknown' ? `<button data-action="reveal-cast-knows" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;color:#9b6dff;cursor:pointer">🔍让ta认出你</button>
                    <button data-action="cast-susp-sens" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">起疑速度:${esc(c.suspSens || '正常')}</button>
                    <button data-action="cast-reset-susp" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;cursor:pointer">清零怀疑度</button>` : ''}
                  </div>
                  ${c.knows === 'unknown' ? ((c.clues || []).length ? `<div style="margin-top:6px;font-size:11px;color:#999">ta 攒到的线索:${(c.clues || []).map(x => esc(x)).join(' · ')}</div>` : `<div style="margin-top:6px;font-size:11px;color:#bbb">还没攒到线索。让 ta 刷你帖子/回评论/私信时,从内容里找和真实 {{user}} 重合的线索来加分。</div>`) : ''}
                </div>
                <div style="border-top:1px dashed #eee;padding-top:8px">
                  <div style="font-size:12px;color:#666;margin-bottom:4px">🎭 小号马甲:ta <b>知道</b>对面是你、却用假名瞒着你接近——你这边看到的是个陌生人,直到揭穿。</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px">
                    <button data-action="import-cast-alt" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#9b6dff;color:#fff;cursor:pointer">📥 从主线导入 ta 的小号</button>
                    ${(d.dms || []).some(x => x.castAlt && x.castId === c.id) ? `<button data-action="reveal-cast-alt" data-id="${c.id}" style="font-size:12px;padding:4px 9px;border:none;border-radius:6px;background:#e8e8ee;color:#ff2442;cursor:pointer">🔍 揭穿小号</button>` : ''}
                  </div>
                  ${(() => { const _a = (d.dms || []).find(x => x.castAlt && x.castId === c.id); return _a ? `<div style="margin-top:6px;font-size:11px;color:#999">当前小号:「${esc(_a.name)}」${_a.castAltRevealed ? '(已揭穿)' : '(伪装中,你那头不知道是 ta)'}</div>` : ''; })()}
                </div>
              </div>` : ''}
            </div>`).join('')}</div>` : '<div class="xhs-set-help" style="margin-top:8px">还没登记角色。点上面「自动识别」或「手动加」。</div>'}
          ${(d.cast && d.cast.length) ? `<button class="xhs-set-btn" data-action="clear-cast" style="background:#fbeaea;color:#ff2442;margin-top:8px">🗑 清空花名册(全部角色)</button>` : ''}
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📝 全局附加提示词</summary>
          <div class="xhs-set-help">把你预设里防油腻/风格那段规则粘进来,会自动加到手机每一次 AI 生成的最前面、最高优先级。</div>
          <textarea id="set-extra-prompt" rows="6" placeholder="例:不要霸总言情腔(壁咚/邪魅一笑/危险地眯眼/不容拒绝…);不要油腻土味情话;不要爹味/上位姿态;不要情感操控/威胁抛弃;语气自然口语、别端着;严格按角色卡人设,别OOC…">${esc(d.extraPrompt || '')}</textarea>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">💬 整体聊天风格(活人感)</summary>
          <div class="xhs-set-help">这里写"大家共同的网上聊天方式",<b>不是</b>某个特定人的人设——特定某人的风格请在小红书「char 的小红书资料」或微信对话里的「🎭 线上人设」单独改。留空=不附加。</div>
          <textarea id="set-chatstyle" rows="6" placeholder="例:消息短、一次只说一点、最多3-4条、末尾不加句号;先反应再内容(啊？/喔……/草);可碎片化、单字成句;别审问式连环提问;别长篇大论…">${esc(d.chatStyle || '')}</textarea>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🚫 禁词 / 替换表(全局·最硬)</summary>
          
          <textarea id="set-banwords" rows="6" placeholder="例如:&#10;薄唇→null&#10;猎人/猎物→null&#10;再这样我就走了→null&#10;哭成这样给谁看？→null&#10;严禁「不是……而是……」句式">${esc(d.banWords || '')}</textarea>
          <label class="xhs-set-check" style="margin-top:8px">
            <input id="set-boss-killer" type="checkbox" ${d.bossKiller ? 'checked' : ''}/>
            霸总粉碎(一键禁用壁咚/邪魅/薄唇/"女人你成功引起我注意"那套言情腔)
          </label>
          
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🔥 热梗素材(全局共用)</summary>
          
          <textarea id="set-memes" rows="5" placeholder="例如:&#10;city不city&#10;那咋了&#10;包的&#10;偷感很重&#10;我嘞个豆…">${esc(d.memes || '')}</textarea>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🖼 手机主页背景</summary>
          <div class="xhs-wall-grid">${swatches}</div>
          <div class="xhs-pub-row" style="margin-top:8px">
            <label>自定义背景图 URL</label>
            <input id="set-home-bgurl" value="${esc(homeBgUrl(d))}" placeholder="贴图片链接,留空用上面的渐变"/>
          </div>
          <div class="xhs-set-help">填了图片链接,保存后优先用图片做背景</div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>主页文字颜色</label><input id="set-home-text" type="color" value="${esc(d.homeText || '#ffffff')}"/></div>
          <div class="xhs-set-help">白色/浅色壁纸看不清时间和图标名时,把它调深</div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📱 ta 的手机</summary>
          <div class="xhs-set-help">桌面那个「ta 的手机」app(只单人卡能打开,多人卡敬请期待)。app 图标在上面「App 图标」里改</div>
          <div class="xhs-pub-row" style="margin-top:8px">
            <label>进去后的主屏背景图 URL(留空用默认深紫渐变)</label>
            <input id="set-charphone-bg" value="${esc(d.charPhoneBg || '')}" placeholder="贴图片链接"/>
          </div>
          <div class="xhs-pub-row" style="margin-top:8px">
            <label>锁屏背景图 URL(留空跟随主屏背景)</label>
            <input id="set-cplockbg" value="${esc(d.charPhoneLockBg || '')}" placeholder="贴图片链接"/>
          </div>
          <div class="xhs-pub-row" style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="set-cp-darktext" ${d.charPhoneTextColor === 'dark' ? 'checked' : ''} style="width:auto"/>
            <label style="margin:0">桌面/锁屏文字用黑色(浅色壁纸时勾上)</label>
          </div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>微信图标 URL</label><input id="set-cpicon-wx" value="${esc((d.charPhoneIcons || {}).wx || '')}" placeholder="留空用默认 💬"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>备忘录图标 URL</label><input id="set-cpicon-notes" value="${esc((d.charPhoneIcons || {}).notes || '')}" placeholder="留空用默认 📝"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>Safari 图标 URL</label><input id="set-cpicon-safari" value="${esc((d.charPhoneIcons || {}).safari || '')}" placeholder="留空用默认 🧭"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>网易云 图标 URL</label><input id="set-cpicon-music" value="${esc((d.charPhoneIcons || {}).music || '')}" placeholder="留空用默认 🎵"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>淘宝 图标 URL</label><input id="set-cpicon-taobao" value="${esc((d.charPhoneIcons || {}).taobao || '')}" placeholder="留空用默认 🛒"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>支付宝 图标 URL</label><input id="set-cpicon-alipay" value="${esc((d.charPhoneIcons || {}).alipay || '')}" placeholder="留空用默认 💰"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>豆包 图标 URL</label><input id="set-cpicon-doubao" value="${esc((d.charPhoneIcons || {}).doubao || '')}" placeholder="留空用默认 🫛"/></div>
          <div class="xhs-pub-row" style="margin-top:8px"><label>拉屎 图标 URL</label><input id="set-cpicon-poop" value="${esc((d.charPhoneIcons || {}).poop || '')}" placeholder="留空用默认 💩"/></div>
          <div class="xhs-pub-row" style="margin-top:14px">
            <label>🎁 外观分享(图标 + 壁纸)— 可应用到别的聊天 / 别人的酒馆</label>
            <button class="xhs-set-btn" data-action="cp-theme-export" style="background:#9b6dff">⬆ 导出当前外观</button>
            <textarea id="cp-theme-out" rows="3" readonly placeholder="点上面「导出」后,这里会出现一串代码,复制发给别人" style="margin-top:6px"></textarea>
            <textarea id="cp-theme-in" rows="3" placeholder="把别人给你的外观代码粘到这里,再点下面「导入」" style="margin-top:6px"></textarea>
            <button class="xhs-set-btn" data-action="cp-theme-import" style="background:#5aa96b;margin-top:6px">⬇ 导入外观(套用)</button>
            <div class="xhs-set-help">导出的是图标 URL + 壁纸 URL + 字体色设置。对方网络能打开这些图片链接才会显示;用的是内置默认图(如那只屎)的不受影响。</div>
          </div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📱 App 图标(自定义)</summary>
          <div class="xhs-set-help">填图片 URL 换掉桌面上的 App 图标,留空用默认</div>
          <div class="xhs-pub-row"><label>📕 小红书</label><input id="set-icon-xhs" value="${esc((d.appIcons || {}).xhs || '')}" placeholder="图片URL"/></div>
          <div class="xhs-pub-row"><label>💬 微信</label><input id="set-icon-wx" value="${esc((d.appIcons || {}).wx || '')}" placeholder="图片URL"/></div>
          <div class="xhs-pub-row"><label>⚙️ 设置</label><input id="set-icon-set" value="${esc((d.appIcons || {}).set || '')}" placeholder="图片URL"/></div>
          <div class="xhs-pub-row"><label>📱 ta 的手机</label><input id="set-cpappicon" value="${esc(d.charPhoneAppIcon || '')}" placeholder="图片URL"/></div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🔗 手机挂件</summary>
          
          <label class="xhs-set-check"><input id="set-charm-off" type="checkbox" ${d.charmOff ? 'checked' : ''}/> 关闭挂件(不显示)</label>
          <div class="xhs-pub-row"><label>挂件图片 URL</label><input id="set-charm-img" value="${esc(d.charmImg || '')}" placeholder="留空=默认 🧸"/></div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🎨 外观导入 &amp; 导出</summary>
          <button class="xhs-set-btn" style="background:#576b95" data-action="export-theme">📤 导出我的外观</button>
          <div class="xhs-pub-row" style="margin-top:10px">
            <label>导入别人的外观(粘贴对方导出的内容)</label>
            <textarea id="set-theme-import" rows="3" placeholder="把别人导出的外观代码整段粘到这里"></textarea>
          </div>
          <button class="xhs-set-btn" style="background:#1aad19" data-action="import-theme">📥 导入并应用</button>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">💬 信息气泡颜色</summary>
          <div class="xhs-pub-row"><label>我的气泡</label><input id="set-bubble-me" type="color" value="${esc(d.bubbleMe || '#95ec69')}"/></div>
          <div class="xhs-pub-row"><label>对方气泡</label><input id="set-bubble-other" type="color" value="${esc(d.bubbleOther || '#ffffff')}"/></div>
          <div class="xhs-set-help">小红书私信、群聊、微信聊天的气泡都用这个配色</div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">😀 表情包(全局共用)</summary>
          <div class="xhs-set-help">一行一个,格式 名字：图片URL</div>
          <textarea id="set-stickers" rows="4" placeholder="开心：https://.../happy.png&#10;裂开：https://.../crack.png">${esc((d.stickers || []).map(s => `${s.name}：${s.url}`).join('\n'))}</textarea>
          ${(d.stickers || []).length ? `<div class="xhs-sticker-preview">${d.stickers.map(s => `<img src="${esc(s.url)}" title="${esc(s.name)}"/>`).join('')}</div>` : ''}
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🔌 API(全局共用)</summary>
          <label class="xhs-set-check">
            <input id="set-use-main" type="checkbox" ${d.api.useMainApi !== false ? 'checked' : ''}/>
            使用酒馆主 API(推荐)
          </label>
          <div class="xhs-set-help">不勾选则需填下面自定义 API</div>
          <div class="xhs-pub-row"><label>API URL</label><input id="set-url" value="${esc(d.api.apiurl || '')}" placeholder="可选,留空走主API"/></div>
          <div class="xhs-pub-row"><label>API Key</label><input id="set-key" type="password" value="${esc(d.api.key || '')}" placeholder="可选"/></div>
          <div class="xhs-pub-row"><label>模型</label><input id="set-model" value="${esc(d.api.model || '')}" placeholder="手填或点下方拉取"/></div>
          <button class="xhs-set-btn" data-action="fetch-models" style="background:#576b95">🔄 拉取可用模型</button>
          <select id="set-model-select" class="xhs-model-select" style="display:none"><option value="">— 选择一个模型 —</option></select>
          <div id="set-model-hint" class="xhs-set-help" style="margin-top:4px"></div>
        </details>
        <div style="height:40px"></div>
      </div>`;
  }
  async function setWallpaper(bg) {
    const d = loadData();
    d.homeBg = bg || '';
    await saveData(d);
    refreshXhs();
  }
  function exportTheme() {
    const d = loadData();
    const obj = {
      homeBg: d.homeBg || '',
      homeText: d.homeText || '#ffffff',
      appIcons: {
        xhs: (d.appIcons || {}).xhs || '',
        wx: (d.appIcons || {}).wx || '',
        set: (d.appIcons || {}).set || '',
      },
      charmImg: d.charmImg || '',
      charmImg2: d.charmImg2 || '',
      bubbleMe: d.bubbleMe || '',
      bubbleOther: d.bubbleOther || '',
    };
    const text = JSON.stringify(obj);
    const TOP = getTop();
    try { if (TOP.navigator && TOP.navigator.clipboard) TOP.navigator.clipboard.writeText(text); } catch (e) {}
    try { TOP.prompt('已尝试复制到剪贴板。整段复制发给别人,他们粘到"导入"框即可:', text); } catch (e) {}
    toastr.success('已导出(已尝试复制)');
  }
  async function importTheme() {
    const raw = (readInputCache('set-theme-import') || '').trim();
    if (!raw) return toastr.warning('先把别人的外观代码粘进框里');
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s < 0 || e < 0) return toastr.error('没识别到外观代码');
    let obj;
    try { obj = JSON.parse(raw.slice(s, e + 1)); } catch (err) { return toastr.error('外观代码格式不对'); }
    if (!obj || typeof obj !== 'object') return toastr.error('外观代码无效');
    const d = loadData();
    ['homeBg', 'homeText', 'charmImg', 'charmImg2', 'bubbleMe', 'bubbleOther'].forEach(k => {
      if (typeof obj[k] === 'string') d[k] = obj[k];
    });
    if (obj.appIcons && typeof obj.appIcons === 'object') {
      d.appIcons = d.appIcons || {};
      ['xhs', 'wx', 'set'].forEach(k => { if (typeof obj.appIcons[k] === 'string') d.appIcons[k] = obj.appIcons[k]; });
    }
    clearInputCache('set-theme-import');
    ['set-home-bgurl', 'set-icon-xhs', 'set-icon-wx', 'set-icon-set'].forEach(clearInputCache);
    await saveData(d);
    updateCharm();
    refreshXhs();
    toastr.success('✓ 已导入外观');
  }
  // ====== 删除评论(自己的/别人的,双击+多选) ======
  function removeCommentById(post, cid) {
    const tops = ensureThreaded(post) || [];
    const ti = tops.findIndex(t => t.id === cid);
    if (ti >= 0) { tops.splice(ti, 1); post.comments = tops; return true; }
    for (const t of tops) {
      const reps = t.replies || [];
      const ri = reps.findIndex(r => r.id === cid);
      if (ri >= 0) { reps.splice(ri, 1); return true; }
    }
    return false;
  }
  async function delComment(postId, cid) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post || !cid) return;
    if (removeCommentById(post, cid)) {
      d.routeContext.cmtMenuCid = null;
      await saveData(d);
      refreshXhs();
      toastr.success('已删除评论');
    }
  }
  async function cmtMulti(postId, cid) {
    const d = loadData();
    d.routeContext.cmtMenuCid = null;
    d.routeContext.cmtSelMode = true;
    d.routeContext.cmtSel = cid ? [cid] : [];
    await saveData(d);
    refreshXhs();
    toastr.info('点评论勾选,再点"删除"');
  }
  async function cmtSelToggle(cid) {
    if (!cid) return;
    const d = loadData();
    const arr = d.routeContext.cmtSel || [];
    const pos = arr.indexOf(cid);
    if (pos >= 0) arr.splice(pos, 1); else arr.push(cid);
    d.routeContext.cmtSel = arr;
    await saveData(d);
    refreshXhs();
  }
  async function cmtSelConfirm(postId) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    const ids = (d.routeContext.cmtSel || []).slice();
    let n = 0;
    ids.forEach(cid => { if (removeCommentById(post, cid)) n++; });
    d.routeContext.cmtSelMode = false;
    d.routeContext.cmtSel = [];
    await saveData(d);
    refreshXhs();
    toastr.success(`已删除 ${n} 条评论`);
  }
  async function cmtSelCancel() {
    const d = loadData();
    d.routeContext.cmtSelMode = false;
    d.routeContext.cmtSel = [];
    await saveData(d);
    refreshXhs();
  }

  async function delChatMsg(idx) {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const d = loadData();
    const arr = currentChatArr(d);
    if (!arr || !arr[i]) return;
    arr.splice(i, 1);
    d.routeContext.delIdx = null;
    await saveData(d);
    refreshXhs();
    toastr.success('已删除');
  }
  // 改单条消息的剧情时间戳;并可一键设为"当前剧情时间"(锁定,之后不再被 AI 自动改动)
  async function editMsgTime(idx) {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const TOP = getTop();
    let d = loadData();
    if (!d.useStoryTime) { toastr.info('先在 设置 → 🕐 剧情时间 里开启「时间按剧情走」'); return; }
    const arr = currentChatArr(d);
    if (!arr || !arr[i]) { d.routeContext.delIdx = null; await saveData(d); refreshXhs(); return; }
    const cur = (arr[i].st || effStoryTime(d) || '').trim();
    const val = TOP.prompt('修改这条消息显示的剧情时间(例:5月20日 周五 19:30):', cur);
    d = loadData();
    const arr2 = currentChatArr(d);
    if (val === null || !arr2 || !arr2[i]) { d.routeContext.delIdx = null; await saveData(d); refreshXhs(); return; }
    const t = String(val).trim().slice(0, 40);
    arr2[i].st = t;
    d.routeContext.delIdx = null;
    const reordered = sortChatByStoryTime(arr2);
    await saveData(d);
    refreshXhs();
    if (t && TOP.confirm(`要把「${t}」设为【当前剧情时间】吗?\n\n设了之后:之后所有新消息/新帖都从这个时间起算,并【锁定】不再被 AI 自动改动(可解决时间忽前忽后的问题)。\n点"取消"则只改这一条。`)) {
      const d2 = loadData();
      d2.storyTimeManual = t;
      await saveData(d2);
      refreshXhs();
      toastr.success('已改这条 + 锁定当前剧情时间为 ' + t + (reordered ? ',并按时间重排' : ''));
    } else {
      toastr.success('已改这条消息的时间' + (reordered ? ',并按时间重排' : ''));
    }
  }
  async function msgMulti(idx) {
    const i = parseInt(idx);
    const d = loadData();
    d.routeContext.delIdx = null;
    d.routeContext.delSelMode = true;
    d.routeContext.delSel = isNaN(i) ? [] : [i];
    await saveData(d);
    refreshXhs();
    toastr.info('点消息勾选,再点底部"删除"或"改时间"');
  }
  // 引用某条消息:记下"谁说的+内容"放进输入栏,发出去时挂到新消息上
  async function msgQuote(idx) {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const d = loadData();
    const arr = currentChatArr(d);
    if (!arr || !arr[i]) return;
    d.routeContext.quoting = chatMsgQuote(arr[i], d);
    d.routeContext.delIdx = null;
    await saveData(d);
    refreshXhs();
    try { const inp = getTop().document.getElementById(d.currentRoute === 'group-chat' ? 'xhs-grp-input' : 'xhs-dm-input'); if (inp) inp.focus(); } catch (e) {}
  }
  async function quoteCancel() {
    const d = loadData();
    if (d.routeContext) d.routeContext.quoting = null;
    await saveData(d);
    refreshXhs();
  }
  async function delSelToggle(idx) {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const d = loadData();
    const arr = d.routeContext.delSel || [];
    const pos = arr.indexOf(i);
    if (pos >= 0) arr.splice(pos, 1); else arr.push(i);
    d.routeContext.delSel = arr;
    await saveData(d);
    refreshXhs();
  }
  async function delSelCancel() {
    const d = loadData();
    d.routeContext.delSelMode = false;
    d.routeContext.delSel = [];
    await saveData(d);
    refreshXhs();
  }
  async function delSelConfirm(dmId) {
    const d = loadData();
    const arr = currentChatArr(d);
    if (!arr) return;
    const idxs = (d.routeContext.delSel || []).slice().sort((a, b) => b - a);
    idxs.forEach(i => { if (arr[i]) arr.splice(i, 1); });
    d.routeContext.delSelMode = false;
    d.routeContext.delSel = [];
    await saveData(d);
    refreshXhs();
    toastr.success(`已删除 ${idxs.length} 条`);
  }
  // 批量改选中消息的剧情时间;可一键设为"当前剧情时间"(锁定)
  async function delSelTime() {
    const TOP = getTop();
    let d = loadData();
    if (!d.useStoryTime) { toastr.info('先在 设置 → 🕐 剧情时间 里开启「时间按剧情走」'); return; }
    const arr = currentChatArr(d);
    const idxs = (d.routeContext.delSel || []).slice();
    if (!arr || !idxs.length) { toastr.info('先勾选要改时间的消息'); return; }
    const val = TOP.prompt(`把选中的 ${idxs.length} 条消息的剧情时间统一改成(例:5月20日 周五 19:30):`, '');
    if (val === null) return;
    const t = String(val).trim().slice(0, 40);
    d = loadData();
    const arr2 = currentChatArr(d);
    if (!arr2) return;
    let n = 0;
    idxs.forEach(i => { if (arr2[i]) { arr2[i].st = t; n++; } });
    d.routeContext.delSelMode = false;
    d.routeContext.delSel = [];
    const reordered = sortChatByStoryTime(arr2);
    await saveData(d);
    refreshXhs();
    if (t && TOP.confirm(`已改 ${n} 条${reordered ? '并按时间重排' : ''}。要把「${t}」设为【当前剧情时间】吗?\n\n设了之后新消息/新帖都从这个时间起算并【锁定】,不再被 AI 自动改动。点"取消"则只改这几条。`)) {
      const d2 = loadData(); d2.storyTimeManual = t; await saveData(d2); refreshXhs();
      toastr.success(`已批量改 ${n} 条 + 锁定当前剧情时间为 ${t}`);
    } else {
      toastr.success(`已把 ${n} 条改为 ${t || '(空)'}${reordered ? ',并按时间重排' : ''}`);
    }
  }
  async function setDmAvatar(dmId) {
    const TOP = getTop(); const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const cur = dm.avatar || (dm.isChar ? d.charAvatar : '') || '';
    const v = TOP.prompt('头像图片 URL(留空=用首字母):', cur);
    if (v === null) return;
    dm.avatar = v.trim().slice(0, 500);
    d.routeContext.dmMenuOpen = false;
    await saveData(d); refreshXhs();
    toastr.success('已更新头像');
  }
  async function setWxRemark(dmId) {
    const TOP = getTop(); const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const cur = dm.remark || (dm.isChar ? charDisplayName(d) : dm.name);
    const v = TOP.prompt('设置备注名(留空=恢复原名):', dm.remark || '');
    if (v === null) return;
    dm.remark = v.trim().slice(0, 20);
    d.routeContext.dmMenuOpen = false;
    await saveData(d); refreshXhs();
    toastr.success(dm.remark ? `已备注为「${dm.remark}」` : '已恢复原名');
  }
  // 把微信里【勾选的】聊天记录"截图"成一篇小红书聊天帖
  async function wxShareToXhs(dmId) {
    const TOP = getTop();
    const d = loadData();
    const cname = getCharName();
    const dm = (d.dms || []).find(x => x.id === dmId);
    const group = !dm ? (d.groups || []).find(x => x.id === dmId) : null;
    if (!dm && !group) return;
    const src = dm ? dm.messages : group.chat;
    const other = dm ? (dm.remark || (dm.isChar ? cname : dm.name)) : (group.name || '群聊');
    const selIdx = (d.routeContext.wxSel || []).slice().sort((a, b) => a - b);
    const picked = selIdx.length ? selIdx.map(i => src[i]).filter(Boolean) : [];
    const msgs = picked.filter(m => m && (m.role === 'me' || m.role === 'npc'));
    if (!msgs.length) return toastr.warning('先勾选至少一条消息');
    const nameFor = (m) => m.role === 'me' ? '我' : (m.isChar ? cname : (m.name || (dm ? other : 'TA')));
    const repr = (m) => {
      if (m.kind === 'image') return m.text ? '[图片] ' + m.text : '[图片]';
      if (m.kind === 'voice') return '[语音]' + (m.text ? ' ' + m.text : '');
      if (m.kind === 'transfer' || m.kind === 'red') return '[转账]' + (m.note ? ' ' + m.note : '');
      if (m.kind === 'sticker') return '[表情]';
      if (m.kind === 'share') return '[笔记]' + (m.share && m.share.title ? ' ' + m.share.title : '');
      return m.text || '';
    };
    const meAv = d.wxAvatar || d.userAvatar || '';
    const avFor = (m) => {
      if (m.role === 'me') return meAv;
      if (m.isChar || (dm && dm.isChar)) return (dm && dm.avatar) || d.charAvatar || '';
      if (dm) return dm.avatar || '';
      if (m.avatar) return m.avatar;
      const mem = group && (group.members || []).find(mm => mm.name === m.name);
      return (mem && mem.avatar) || '';
    };
    const chatlog = msgs.map(m => {
      const e = { role: m.role === 'me' ? 'user' : 'char', name: nameFor(m), text: repr(m), avatar: avFor(m) };
      if (m.kind === 'sticker' && m.url) { e.sticker = m.url; e.stickerName = m.name || '表情'; e.text = ''; }
      else if (m.kind === 'image' && m.url) { e.img = m.url; }
      return e;
    }).filter(x => x.text || x.sticker || x.img);
    if (!chatlog.length) return toastr.warning('选中的消息没有可发布的内容');
    const title = TOP.prompt('帖子标题:', '记录一下');
    if (title === null || !title.trim()) return;
    const content = (TOP.prompt('正文(可留空):', '') || '').trim();
    const post = {
      id: uid(), author: d.userName, type: 'chat', chatMode: 'diary',
      chatlog, charName: other, bg: pickTextBg(),
      title: title.trim(), coverText: '聊天记录', content: content || '随手记录一下',
      time: Date.now(), st: stStamp(d), likes: 0, comments: [],
    };
    d.myPosts = d.myPosts || [];
    d.myPosts.unshift(post);
    d.currentApp = 'xhs';
    d.currentRoute = 'view';
    d.routeContext = { postId: post.id };
    await saveData(d);
    await syncToMain(`[小红书] {{user}} 把一段${group ? '群' : ''}聊天记录发成了笔记:\n${postSyncText(post)}`, d.syncHidden);
    refreshXhs();
    toastr.success('✓ 已发到小红书');
  }

  // ============ 底部导航 (5 格,全局共用) ============
  function bottomNav(active) {
    const ud = loadData();
    const unread = totalUnread(ud);
    const tab = (route, label, svg, isActive, action) => `
      <button class="xhs-nav-btn ${isActive ? 'xhs-nav-active' : ''}" data-action="${action}" ${route ? `data-route="${route}"` : ''}>
        ${svg}<span>${label}</span>
      </button>`;
    return `
      <div class="xhs-bottom-nav">
        ${tab('feed', '首页',
          `<svg viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" stroke="${active === 'feed' ? '#ff2442' : '#999'}" stroke-width="1.6" fill="${active === 'feed' ? '#ff2442' : 'none'}" fill-opacity="0.15"/></svg>`,
          active === 'feed', 'nav')}
        ${tab('', '市集',
          `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9h16l-1 11H5L4 9zM8 9V6a4 4 0 018 0v3" stroke="#bbb" stroke-width="1.6" stroke-linecap="round"/></svg>`,
          false, 'market-disabled')}
        ${`<button class="xhs-nav-btn xhs-nav-plus" data-action="nav" data-route="publish"><div class="xhs-plus-circle">+</div></button>`}
        <button class="xhs-nav-btn ${active === 'messages' ? 'xhs-nav-active' : ''}" data-action="nav" data-route="messages" style="position:relative">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0120 17H10l-4.5 3.5V17H4a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 014 5z" stroke="${active === 'messages' ? '#ff2442' : '#999'}" stroke-width="1.6" fill="${active === 'messages' ? '#ff2442' : 'none'}" fill-opacity="0.12" stroke-linejoin="round"/></svg>
          ${unread ? `<span class="xhs-nav-dot">${unread > 9 ? '9+' : unread}</span>` : ''}
          <span>消息</span>
        </button>
        ${tab('profile', '我',
          `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="${active === 'profile' ? '#ff2442' : '#999'}" stroke-width="1.6"/><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" stroke="${active === 'profile' ? '#ff2442' : '#999'}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
          active === 'profile', 'nav')}
      </div>`;
  }

  // 兜底页:任何"找不到"的情况都带返回键和底部导航,避免卡死
  function notFoundScreen(msg, backRoute, navActive) {
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="${backRoute || 'feed'}">‹</button>
        <span style="font-weight:600"> </span>
        <span style="width:32px"></span>
      </div>
      <div class="xhs-scroll"><div class="xhs-empty">${esc(msg)}<br/><br/>点左上角 ‹ 返回</div></div>
      ${bottomNav(navActive || 'feed')}
    `;
  }

  // ============ 信息流 ============
  function renderFeed(d) {
    const cat = d.feedCat || 'rec';
    const cardHtml = (p) => {
      const authorColor = randomColor(p.author || 'x');
      const _avUrl = (p._mine && d.userAvatar) ? d.userAvatar : '';
      const _disp = p._mine ? (d.userName || p.author || '匿名') : (p.author || '匿名');
      return `
        <div class="xhs-card" data-action="xhs-view" data-id="${p.id}">
          ${cardCover(p, p._mine)}
          <div class="xhs-card-body">
            <div class="xhs-card-title">${esc(p.title)}</div>
            <div class="xhs-card-foot">
              <div class="xhs-card-author" data-action="open-user" data-name="${esc(_disp)}">
                <div class="xhs-card-avatar">${avatarFor(d, _disp, { bg: authorColor, url: _avUrl })}</div>
                <span class="xhs-card-author-name">${esc(_disp)}${isCharAcct(_disp, d) ? charBadge() : ''}</span>
              </div>
              <span class="xhs-card-like ${p.likedByMe ? 'xhs-card-liked' : ''}">❤ ${formatLikes(p.likes || 0)}</span>
            </div>
          </div>
        </div>
      `;
    };
    let body;
    if (cat === 'fic') {
      const ficCards = (d.ficFeed || []).map(p => ({ ...p })).map(cardHtml).join('');
      body = `
        <div class="xhs-fic-bar">
          ${(d.ficFeed || []).length ? '<button class="xhs-fic-clear" data-action="clear-fic-zone">清空</button>' : ''}
          <button class="xhs-fic-iconbtn" data-action="gen-fic-zone" title="换一批同人文">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 0113.3-5.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 13a8 8 0 01-13.3 5.3L4 16"/><path d="M4 21v-5h5"/></svg>
          </button>
        </div>
        <div class="xhs-scroll">
          <div class="xhs-grid">${ficCards || '<div class="xhs-empty">点上面的 🔄 生成同人文<br/><span style="font-size:11px;color:#aaa">CP来源 / 字数 / 梗池 / 体裁<br/>在 设置 → 推荐偏好 &amp; 同人文 里调</span></div>'}</div>
          <div style="height:60px"></div>
        </div>`;
    } else {
      const feed = (d.feed || []).map(p => ({ ...p }));
      const myPosts = (d.myPosts || []).map(p => ({ ...p, _mine: true }));
      const all = [...myPosts, ...feed].sort((a, b) => (b.time || 0) - (a.time || 0));
      const cards = all.map(cardHtml).join('');
      body = `
        <div class="xhs-scroll">
          <div class="xhs-grid">${cards || '<div class="xhs-empty">点右上 🔄 生成帖子,<br/>或点底部 + 自己发</div>'}</div>
          <div style="height:60px"></div>
        </div>`;
    }

    return `
      <div class="xhs-topbar xhs-topbar-feed">
        <button class="xhs-icon-btn" data-action="nav" data-route="settings" title="设置">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#333" stroke-width="1.6"/><path d="M19 12a7 7 0 01-.1 1.2l2 1.6-2 3.4-2.4-.9a7 7 0 01-2 1.2l-.4 2.5h-4l-.4-2.5a7 7 0 01-2-1.2l-2.4.9-2-3.4 2-1.6A7 7 0 015 12c0-.4 0-.8.1-1.2l-2-1.6 2-3.4 2.4.9a7 7 0 012-1.2l.4-2.5h4l.4 2.5a7 7 0 012 1.2l2.4-.9 2 3.4-2 1.6c.1.4.1.8.1 1.2z" stroke="#333" stroke-width="1.4"/></svg>
        </button>
        <div class="xhs-tabs xhs-tabs-center">
          <span class="xhs-tab">关注</span>
          <span class="xhs-tab xhs-tab-active">发现</span>
          <span class="xhs-tab">同城</span>
        </div>
        <button class="xhs-icon-btn xhs-gen-top" data-action="refresh-feed" title="生成新帖子">
          <svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 0113.3-5.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 13a8 8 0 01-13.3 5.3L4 16"/><path d="M4 21v-5h5"/></svg>
        </button>
      </div>
      <div class="xhs-cats">
        <span class="xhs-cat ${cat === 'rec' ? 'xhs-cat-active' : ''}" data-action="feed-cat" data-cat="rec">推荐</span>
        <span class="xhs-cat ${cat === 'fic' ? 'xhs-cat-active' : ''}" data-action="feed-cat" data-cat="fic">同人文</span>
        <span class="xhs-cat">热点</span>
        <span class="xhs-cat">RED</span>
        <span class="xhs-cat">直播</span>
        <span class="xhs-cat">穿搭</span>
        <span class="xhs-cat-more">⌄</span>
      </div>
      ${body}
      ${bottomNav('feed')}
    `;
  }

  function formatLikes(n) {
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  const XHS_LOCS = ['浙江', '江苏', '广东', '北京', '上海', '四川', '湖南', '山东', '福建', '陕西', '河南', '湖北', '辽宁', '云南', '英国', '未知'];
  function pickLoc() { return XHS_LOCS[Math.floor(Math.random() * XHS_LOCS.length)]; }

  // 纯文字帖子的随机背景色(仿小红书文字卡片)
  const XHS_TEXT_BGS = [
    { bg: '#fdeef0', fg: '#7a3b46' }, { bg: '#eaf3fb', fg: '#345268' },
    { bg: '#fef6e6', fg: '#7a5a23' }, { bg: '#ecf6ee', fg: '#2f5d3a' },
    { bg: '#f1edfb', fg: '#4d3b6b' }, { bg: '#fdeef7', fg: '#7a3b62' },
    { bg: '#eafaf6', fg: '#1f5d52' }, { bg: '#fff0ea', fg: '#7a4530' },
  ];
  function pickTextBg() { return XHS_TEXT_BGS[Math.floor(Math.random() * XHS_TEXT_BGS.length)]; }

  // 小红书网名风格:别全是规整中文,要千奇百怪
  function xhsNameRule() {
    return `【网名风格·重要】小红书网名千奇百怪,请混搭多种风格,别全是规整中文昵称,更【别老翻来覆去用 momo、小张啊、阿白 这几个】:可以是颜文字/符号(如 "𝓛𝓲𝓼𝓪"、"y."、"____"、"#椒")、英文或拼音(如 "Yuki"、"ostrich"、"Cici")、中英数混合(如 "阿白Baii"、"77怪")、看似乱码的字母、emoji 结尾、或故意奇怪的词,也保留少量正常中文名。【本轮每个人都用互不相同的新名字,不要重复】。可参考这些风格各异的例子找灵感(别照抄,自己另造新的):${_sampleNames(12).join('、')}。`;
  }

  // 取 char 名字(同人文用):优先绑定的角色卡,其次主对话里的 char,最后 TA
  function getCharName() {
    try {
      const d = loadData();
      if (d.charBinding && d.charBinding.name) return d.charBinding.name;
      const ctx = getCtx();
      if (ctx && Array.isArray(ctx.chat)) {
        const c = ctx.chat.filter(m => !m.is_user && m.name).slice(-1)[0];
        if (c && c.name) return c.name;
      }
    } catch (e) {}
    return 'TA';
  }

  // 平台基调/世界观,拼进生成提示词
  function toneHint(d) {
    return (d && d.platformTone) ? `\n【平台基调/世界观】本平台整体风格、题材、氛围、说话尺度都按下面这个设定来:\n${String(d.platformTone).slice(0, 1500)}\n` : '';
  }

  // 文风 / 禁词。strict=true 用于同人文(严格);false 用于评论/擦边(部分生效,保留真人油腻感)
  const BOSS_BANLIST = '霸道总裁腔、壁咚、强吻、邪魅一笑、勾唇、薄唇微抿、危险地眯眼、桀骜不驯、不容拒绝/不容置疑、薄怒、低沉磁性的嗓音、修长且骨节分明的手指、"女人你成功引起了我的注意"、"乖"字调教腔、油腻总裁言情套路';
  // 同人文随机"故事种子",强制每条走向不同,避免千篇一律
  const FIC_SCENES = ['雨夜便利店', '医院走廊', '婚礼后台', '深夜出租屋', '天台', '末班地铁', '葬礼之后', '旧书店打烊时', '机场到达口', '直播下播后', '搬家那天', '同学聚会散场', '台风天的车里', '片场休息间隙', '凌晨的便当店', '考研自习室', '老房子拆迁前', '酒局散场'];
  const FIC_DYNAMICS = ['暗恋未遂', '破镜重圆', '先婚后爱', '双向暗恋互相试探', '错过多年后重逢', '从敌对到沦陷', '一直是单箭头', '假戏真做', '禁忌/骨科', '上下级', '青梅竹马走散又遇见', '一夜后的纠缠'];
  const FIC_TONES = ['酸涩克制', '炽热占有', '钝刀子割肉的虐', '温吞治愈', '满是张力的暧昧', '怅然若失的怀旧'];
  const FIC_POV = ['第一人称内心独白', '第三人称冷静旁观', '书信/短信体', '聊天记录体', '第二人称("你")', '碎片化蒙太奇'];
  const FIC_END = ['HE', 'BE', '开放式结局', 'BE美学留白', 'HE但留一根刺'];
  // 普通帖"口吻种子":每次刷新随机抽几种完全不同的说话口吻,强制 10 条像不同的人写的(治同质化)
  const NPC_VOICES = [
    '话痨流水账长文,事无巨细',
    '高冷三两句就完事、惜字如金',
    '全小写几乎不打标点的丧系疲惫感',
    '满屏 emoji 和颜文字的元气音',
    '爹味说教、爱给人上课',
    '文艺矫情、爱用比喻和省略号…',
    '理中客分析帝、一二三四列点',
    '满嘴网络黑话烂梗的极度网感',
    '中年养生、朴实长辈口吻',
    '精致白领凡尔赛、不经意地秀',
    '暴躁开麦、连用感叹号的愤怒吐槽',
    '阴阳怪气、反讽拉满',
    '稚气未脱的学生语气',
    '社恐小心翼翼、不停自我怀疑',
    '抽象发疯文学',
    '冷静克制的专业测评/科普向',
    '甜妹撒娇黏糊糊',
    '大大咧咧带点方言味的直球',
    '丧里带笑的摆烂自嘲',
    '端着的知识分子腔、引经据典',
  ];
  function npcVoiceSeed() {
    const arr = NPC_VOICES.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    const pick = arr.slice(0, 5);
    return `\n【口吻要各不相同·重要】这 10 条要像【10 个不同的人】发的,每条的说话口吻、句式、长短、标点和 emoji 习惯都要明显不一样,别都是同一种"小红书 AI 腔"。这一批里至少覆盖这几种【完全不同的口吻】(对号入座、别糊成一种):${pick.map((x, i) => `(${i + 1})${x}`).join(';')}。其余几条也各换花样:有的就一句话、有的长篇;有的不用 emoji、有的满屏;有的爱用…省略号、有的爱用感叹号。`;
  }
  function _pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ficSeedHint(n, lockCP) {
    const seeds = [];
    for (let i = 0; i < Math.max(1, n); i++) {
      const parts = [`情境「${_pick(FIC_SCENES)}」`];
      if (!lockCP) parts.push(`关系「${_pick(FIC_DYNAMICS)}」`);
      parts.push(`基调「${_pick(FIC_TONES)}」`, `视角「${_pick(FIC_POV)}」`, `结局「${_pick(FIC_END)}」`);
      seeds.push(parts.join('+'));
    }
    return `\n【同人文·每条必须各不相同】下面给每条一个随机灵感种子,请据此让它们的走向、结构、语气【明显拉开差异】,别千篇一律、别来回用同几句话和同一个套路:\n- ${seeds.join('\n- ')}\n额外要求:开头不要都一个句式;有的多对话推进、有的纯内心独白、有的用书信/聊天体;【禁用老三样】(如"他眼神一暗""空气突然安静""心脏漏跳一拍""喉结滚动"这类烂俗句)。\n`;
  }

  function styleHint(d, strict) {
    const ref = (d && d.styleRef || '').trim();
    const ban = (d && d.banWords || '').trim();
    const boss = (d && d.bossKiller) ? BOSS_BANLIST : '';
    let out = '';
    // 用户的替换/禁令表:逐字照搬、严格、全局生效,不改写它的语义
    if (ban) {
      out += `\n【用词/句式替换表·全局最高优先级·必须严格遵守】下面是"原词/原句式 → 替换"的规则(箭头右边是 null 就表示直接不写、改写句子绕过)。请严格执行,生成的任何文字里都【绝不出现】箭头左边的词或句式:\n${ban}\n`;
    }
    // 霸总腔:同人文/char 严格执行,评论/擦边部分生效(保留一些油腻真人)。文风偏好(styleRef)已改为只用于同人文,不在这里全局注入。
    const soft = boss ? `避免霸总言情腔(${boss})` : '';
    if (soft) {
      out += strict
        ? `\n【文风·严格执行】${soft}。\n`
        : `\n【文风·部分生效】整体往下面的风格靠,但【允许少数人】保留本来就油腻/夸张的真人感(真实网络确实有):${soft}。\n`;
    }
    return out;
  }

  // 用户填的热梗,拼进生成提示词;太长则每次随机抽一批,控制长度+保证多样
  function memeHint(d) {
    const raw = (d && d.memes) ? String(d.memes).trim() : '';
    if (!raw) return '';
    let pool = raw;
    if (raw.length > 900) {
      const lines = raw.split(/\n+/).map(s => s.trim()).filter(s => s && s.length > 1);
      for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; }
      const picked = []; let len = 0;
      for (const ln of lines) { if (len > 700) break; picked.push(ln); len += ln.length; }
      pool = picked.join('\n');
    }
    return `\n【热梗(克制使用)】下面有些热梗供参考,但【绝大多数发言/帖子不带梗】,只在很合适时偶尔点缀;同一批生成里【不要重复用同一个梗】,尤其同类型的帖子别都用一样的梗;千万别每条都玩梗、别硬塞:\n${pool}\n`;
  }
  // 小红书路人 NPC 专属风格/语录(发疯/抽象/阴阳怪气):只用于小红书路人(发帖+评论+粉丝群),char 和微信都不注入
  function xhsNpcStyleLine(d) {
    const raw = (d && d.xhsNpcStyle) ? String(d.xhsNpcStyle).trim() : '';
    if (!raw) return '';
    let pool = raw;
    if (raw.length > 1100) {
      const lines = raw.split(/\n+/).map(s => s.trim()).filter(s => s && s.length > 1);
      for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; }
      const picked = []; let len = 0;
      for (const ln of lines) { if (len > 900) break; picked.push(ln); len += ln.length; }
      pool = picked.join('\n');
    }
    return `\n【小红书路人网友的说话风格/语录库(只有路人网友这股味儿,可仿这种自嘲/反讽/黑色幽默/阴阳怪气/发疯文学的劲儿,但【严禁照搬】下面的句子、要原创同款味道;不必每条都用)。⚠️这股味儿【只用在普通路人帖和评论的口吻上】——如果同一批里有同人文/小说体,那几条【不要】套这个发疯抽象味,按同人文自己的笔风正常写】:\n${pool}\n`;
  }

  // char 评论也能用 user 表情包库:提示词里给可用表情名 + 把表情名映射成 url
  function stickerHintLine(d) {
    const names = (d.stickers || []).map(s => s.name).filter(Boolean);
    const base = `\n【表情】想表达情绪就用【真 emoji】(🙂😂🥺😏🙄…),【别打「[微笑]」「[捂脸]」这种方括号文字码】。`;
    const stk = names.length ? `\n【表情包·私聊要常用】聊到开心/调侃/害羞/无语/撒娇/想活跃气氛时,就【大方发表情包】,像真人发微信/私信那样常用——尤其私下、暧昧、熟络的对话更要发。【发法】:把表情【单独作为 texts 数组里的一条】,原样写成「[表情:表情名]」(表情名必须从这些里【原样】挑一个:${names.join('、')}),解析时会自动变成表情。该发就发、可以和文字穿插,但别一连串只刷表情。` : '';
    return base + stk;
  }
  function stickerUrlMap(d) { const m = {}; (d.stickers || []).forEach(s => { if (s && s.name) m[s.name] = s.url; }); return m; }
  // 去掉模型在回复正文里多写的"回复 XX:""@XX"前缀(UI 已经显示"回复谁"了,别重复)
  function stripReplyPrefix(text, author) {
    let t = String(text || '').trim();
    const a = String(author || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (a) {
      t = t.replace(new RegExp('^回复\\s*[@「]?\\s*' + a + '\\s*[」]?\\s*[:：,，]?\\s*'), '');
      t = t.replace(new RegExp('^@\\s*' + a + '\\s*[:：,，]?\\s*'), '');
    }
    t = t.replace(/^回复\s*[@「]?[^:：\n]{1,12}?[」]?\s*[:：]\s*/, '');
    return t.trim();
  }

  // 小红书自带 emoji 文字码 → 真 emoji(渲染时美化,评论/聊天通用);未收录的方括号原样保留([图片]/[表情]等不受影响)
  const XHS_EMOJI = {
    '微笑': '🙂', '笑哭': '😂', '捂脸': '🤦', '偷笑': '😏', '可爱': '😊', '害羞': '☺️', '得意': '😎',
    '流泪': '😢', '大哭': '😭', '发怒': '😡', '生气': '😠', '惊讶': '😮', '疑问': '🤔', '思考': '🤔',
    '睡': '😴', '亲亲': '😘', '色': '😍', '无语': '😑', '翻白眼': '🙄', 'doge': '🐶', '吃瓜': '🍉',
    '捂嘴': '🤭', '鼓掌': '👏', '赞': '👍', '比心': '🫶', '爱心': '❤️', '心': '❤️', '握手': '🤝',
    'OK': '👌', '胜利': '✌️', '玫瑰': '🌹', '咖啡': '☕', '蛋糕': '🎂', '太阳': '☀️', '月亮': '🌙',
    '委屈': '🥺', '奸笑': '😏', '汗': '😅', '晕': '😵', '可怜': '🥺', '哈欠': '🥱', '闭嘴': '🤐',
    '愉快': '😊', '尴尬': '😬', '再见': '👋', '调皮': '😜', '吐舌': '😝', '酷': '😎', '哭': '😢',
    '抠鼻': '😒', '撇嘴': '😕', '阴险': '😏', '难过': '😔', '惊恐': '😱', '憨笑': '😄'
  };
  function emojifyXhs(s) {
    if (!s) return s;
    return String(s).replace(/\[([^\[\]:：]{1,5})\]/g, (m, name) => (Object.prototype.hasOwnProperty.call(XHS_EMOJI, name) ? XHS_EMOJI[name] : m));
  }

  // 小卡片封面(信息流/主页网格用)
  function cardCover(p, mineTag) {
    if (p.type === 'chat') {
      const c = p.bg || XHS_TEXT_BGS[1];
      const preview = (p.chatlog || []).slice(0, 3).map(x =>
        x.sticker
          ? `<div class="xhs-mini-bub ${x.role === 'user' ? 'xhs-mini-me' : ''}" style="padding:2px;background:transparent"><img src="${esc(x.sticker)}" style="width:30px;height:30px;border-radius:6px;object-fit:cover;display:block"/></div>`
          : `<div class="xhs-mini-bub ${x.role === 'user' ? 'xhs-mini-me' : ''}">${esc((x.text || (x.img ? '[图片]' : '')).slice(0, 14))}</div>`).join('');
      return `<div class="xhs-cover xhs-cover-chat" style="background:${c.bg}">
        ${mineTag ? '<span class="xhs-mine-tag">我的</span>' : ''}
        <div class="xhs-chat-badge">💬 ${p.chatMode === 'help' ? '求助' : '聊天记录'}</div>
        ${preview}
      </div>`;
    }
    if (p.type === 'text') {
      const c = p.bg || XHS_TEXT_BGS[0];
      return `<div class="xhs-cover xhs-cover-text" style="background:${c.bg};color:${c.fg}">
        ${mineTag ? '<span class="xhs-mine-tag">我的</span>' : ''}
        <span class="xhs-cover-quote" style="color:${c.fg}">“</span>
        <div class="xhs-cover-textmain" style="color:${c.fg}">${esc((p.coverText || p.title || '').slice(0, 24))}</div>
      </div>`;
    }
    return `<div class="xhs-cover">
      ${mineTag ? '<span class="xhs-mine-tag">我的</span>' : ''}
      <svg class="xhs-cover-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#d0d0d0" stroke-width="1.4"/><circle cx="8" cy="10" r="1.5" fill="#d0d0d0"/><path d="M3 17l5-5 4 4 3-3 6 6" stroke="#d0d0d0" stroke-width="1.4" fill="none"/></svg>
      <div class="xhs-cover-overlay">${esc((p.coverText || '').slice(0, 18))}</div>
    </div>`;
  }

  // 聊天记录截图卡(帖子详情里显示)
  function chatlogCard(p) {
    const charName = p.charName || 'TA';
    const bubbles = (p.chatlog || []).map(x => {
      const isMe = x.role === 'user';
      const who = x.name || (isMe ? '我' : charName);
      let inner;
      if (x.sticker) inner = `<div class="xhs-shot-bub xhs-shot-bub-sticker"><img class="xhs-shot-sticker" src="${esc(x.sticker)}" alt="${esc(x.stickerName || '表情')}"/></div>`;
      else if (x.img) inner = `<div class="xhs-shot-bub xhs-shot-bub-sticker"><img class="xhs-shot-img" src="${esc(x.img)}" alt="图片"/></div>`;
      else inner = `<div class="xhs-shot-bub">${esc(x.text)}</div>`;
      return `<div class="xhs-shot-msg ${isMe ? 'xhs-shot-me' : 'xhs-shot-other'}">
        <div class="xhs-shot-av">${avatarHtml(x.avatar, randomColor(who), (who || '?')[0])}</div>
        ${inner}
      </div>`;
    }).join('');
    const head = p.ficChat ? '💕 恋爱日记' : `和 ${esc(charName)} 的聊天记录`;
    return `<div class="xhs-shot">
      <div class="xhs-shot-head">${head}</div>
      ${bubbles}
    </div>`;
  }

  // 大封面(帖子详情用)
  function detailCover(p) {
    if (p.type === 'chat') {
      return `<div class="xhs-view-cover xhs-view-cover-chat">${chatlogCard(p)}</div>`;
    }
    if (p.type === 'text') {
      const c = p.bg || XHS_TEXT_BGS[0];
      return `<div class="xhs-view-cover xhs-view-cover-text" style="background:${c.bg}">
        <span class="xhs-cover-quote" style="color:${c.fg}">“</span>
        <div class="xhs-view-textmain" style="color:${c.fg}">${esc(p.coverText || p.title || '')}</div>
      </div>`;
    }
    return `<div class="xhs-view-cover">
      <svg viewBox="0 0 24 24" fill="none" class="xhs-cover-icon-big"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#c8c8c8" stroke-width="1.2"/><circle cx="8" cy="10" r="1.5" fill="#c8c8c8"/><path d="M3 17l5-5 4 4 3-3 6 6" stroke="#c8c8c8" stroke-width="1.2" fill="none"/></svg>
      <div class="xhs-view-cover-overlay">${esc(p.coverText || p.title)}</div>
    </div>`;
  }

  // 把扁平评论(老数据)转成楼层结构:顶层评论 + replies[]
  function ensureThreaded(post) {
    const cs = post.comments || [];
    const threaded = cs.length === 0 || cs.every(c => Array.isArray(c.replies));
    if (threaded) return post.comments;
    const tops = [];
    const pending = [];
    cs.forEach(c => {
      const item = { ...c, replies: [] };
      if (c.reply_to) pending.push(c); else tops.push(item);
    });
    pending.forEach(c => {
      const t = tops.find(t => t.author === c.reply_to);
      if (t) t.replies.push({ ...c });
      else tops.push({ ...c, replies: [] });
    });
    post.comments = tops;
    return tops;
  }

  // 把楼层结构拍平成 [{c, top}],用于按序号定位
  function flattenComments(tops) {
    const flat = [];
    (tops || []).forEach(t => {
      flat.push({ c: t, top: t });
      (t.replies || []).forEach(r => flat.push({ c: r, top: t }));
    });
    return flat;
  }
  function countComments(tops) {
    return (tops || []).reduce((s, t) => s + 1 + (t.replies ? t.replies.length : 0), 0);
  }

  async function refreshFeed() {
    toastr.info('正在生成 10 条帖子…');
    const d0 = loadData();
    const world = getWorldSetting();
    // 防重复:把最近已经刷到的帖子标题喂回去,叫它别再出雷同题材/桥段
    const recentTitles = (d0.feed || []).slice(0, 18).map(p => (p.title || '').trim()).filter(Boolean);
    const avoidLine = recentTitles.length ? `\n【⚠别和这些重复】下面是最近【已经刷到过】的帖子,这次生成的【题材、情节、桥段都要和它们明显不同】,别换个标题讲同一件事:\n${recentTitles.map(t => `· ${t}`).join('\n')}\n` : '';
    const antiCliche = `\n【避开这些被写烂的烂俗桥段】(除非用户口味明确要,否则别用,换更新鲜具体的角度):室友带对象回家/秀恩爱、捡到一只猫狗、被绿/查岗抓出轨、相亲遇到奇葩、地铁/便利店偶遇心动、前任发来结婚请柬、楼下情侣吵架、闺蜜抢男友、租房遇到极品房东/室友、奶茶店帅哥店员、外卖小哥小纸条——这些一眼假的套路尽量别碰。\n`;
    const prefsLine = d0.feedPrefs ? `\n【用户口味偏好(首页整体)】ta 爱看这些题材/氛围,请明显多推、贴合: ${d0.feedPrefs}\n` : '';
    const liked = (d0.likedSignals || []).slice(-12);
    const likedLine = liked.length ? `\n【ta 最近点赞过】(反映口味,可多推类似的): ${liked.join(' / ')}\n` : '';
    const ficN = 0; // 同人文已移到「同人文专区」,推荐页不再混同人文(只出真帖子)
    const ficWMin = Math.max(50, (d0.ficWordMin | 0) || 200);
    const ficWMax = Math.max(ficWMin + 50, (d0.ficWordMax | 0) || 400);
    const ficMode = d0.ficChars || 'random';
    const ficPrefsVal = (d0.ficPrefs || '').trim() || (d0.feedPrefs || '').trim();
    let ficCharsRule = '';
    if (ficMode === 'uchar') ficCharsRule = `主角【固定】用「${d0.userName}」和「${getCharName()}」这一对(就当平台上有人在嗑你俩,可第一或第三人称)`;
    else ficCharsRule = `主角【自拟一对纯虚构的路人 CP】(随便起虚构人名),跟你的世界书设定、角色卡、主线里的任何人物【都无关】,别把世界书/主线里的角色拿来配对`;
    // 嗑"我和char"时,把 char 人设 + 你的资料喂进去,让同人文贴人设、别写崩
    let ucharRoleLine = '';
    if (ficMode === 'uchar') {
      const cr = getRoleDesc();
      const ub = (d0.userBio || '').trim();
      const parts = [];
      if (cr) parts.push(`「${getCharName()}」的人设/性格/说话习惯(写到 ta 时严格贴合 ta 的原人设,别 OOC):${cr}`);
      if (ub) parts.push(`「${d0.userName}」的资料:${ub}`);
      if (parts.length) ucharRoleLine = `\n【这几条同人文嗑的是「${d0.userName}」×「${getCharName()}」,请按下面真实人设来写,别把人写崩】:\n${parts.join('\n')}\n`;
    }
    // 用户自备的梗/桥段池:避重抽取——优先抽最近没用过的,一轮全用完再重置重来
    const ficMemePool = (d0.ficMemes || '').split('\n').map(s => s.trim()).filter(Boolean);
    let ficMemeLine = '';
    let ficUsedToPersist = null;
    if (ficMemePool.length && ficN > 0) {
      const needed = Math.min(Math.max(ficN, 3), ficMemePool.length);
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let used = Array.isArray(d0.ficMemesUsed) ? d0.ficMemesUsed.filter(m => ficMemePool.includes(m)) : [];
      let chosen = shuffle(ficMemePool.filter(m => !used.includes(m))).slice(0, needed);
      if (chosen.length < needed) {
        // 没用过的不够了 → 这一轮算用完,重置,再从剩下的池子补齐本轮
        const rest = shuffle(ficMemePool.filter(m => !chosen.includes(m)));
        chosen = chosen.concat(rest.slice(0, needed - chosen.length));
        used = [];
      }
      const newUsed = used.concat(chosen);
      // 记录已覆盖整个池 → 清空,开启新一轮
      ficUsedToPersist = (newUsed.length >= ficMemePool.length) ? [] : newUsed;
      ficMemeLine = `\n【本轮同人文必须从这些梗/桥段里取灵感,一条一个梗、别重复用同一个,也别用上面没列出的烂大街套路】:\n- ${chosen.join('\n- ')}\n可以把梗改写、组合、换个角度写,但每条的核心桥段要落在上面这些里。\n`;
    }
    // 持久化"已用梗"记录(在调用 AI 前先写好,后面 refreshFeed 重新 loadData 时会带上)
    if (ficUsedToPersist !== null) {
      try { const du = loadData(); du.ficMemesUsed = ficUsedToPersist; await saveData(du); } catch (e) {}
    }
    // 同人文体裁(用户勾选,随机轮用)
    const FIC_FORMATS = {
      prose: `普通短文(${ficWMin}~${ficWMax}字小说式正文,有场景有情绪)`,
      letter: '书信体(写成一两封往来书信/情书,有称呼、正文、落款,字里行间藏感情)',
      diary: '日记体(第一人称日记/碎碎念,可带日期感,记录和对方相关的一天或一件事)',
      qa100: 'CP相性100问(从"CP相性100问"里挑 8~15 个问题,用"Q:…\\nA:…"一问一答的形式写,通过问答体现这对CP的相处与相性,可甜可虐)',
      chat: '微信聊天体(type 设为 "chat":content 写一小段第一人称恋爱日记/碎碎念,再给 chatlog 是两人来回的甜蜜微信对话,side 用 "l"/"r" 区分左右,name 给昵称,十几条以内,甜、有生活感、不尬不油)',
    };
    let selFmts = (Array.isArray(d0.ficFormats) ? d0.ficFormats : ['prose', 'chat']).filter(k => FIC_FORMATS[k]);
    if (!selFmts.length) selFmts = ['prose'];
    const fmtDesc = selFmts.map(k => `「${FIC_FORMATS[k]}」`).join('、');
    const onlyChat = selFmts.length === 1 && selFmts[0] === 'chat';
    const ficLine = ficN > 0
      ? `\n【同人文要求】这 10 条里安排大约 ${ficN} 条是"小说同人文/嗑CP"帖。${ficPrefsVal ? `贴合同人文偏好:${ficPrefsVal}。` : ''}每条额外给 tags 数组(如 ["骨科","酸涩","HE"])。这些同人文的${ficCharsRule}。${ucharRoleLine}${ficMemeLine}
【体裁】这几条同人文的体裁请【只从下面勾选的里随机取、尽量每条不同、轮着换】,不要用没列出的体裁:${fmtDesc}。${selFmts.includes('chat') ? '其中用"微信聊天体"的那条按上面说的给 chatlog。' : ''}${!onlyChat ? '其余非聊天体的,content 写成对应体裁的正文(${ficWMin}~${ficWMax}字,书信/日记/问答各按各自格式)。' : ''}
【未成年角色绝对不可以,只写成年人;可暧昧虐心擦边,但不写露骨性行为细节。】${ficSeedHint(ficN, ficMode === 'uchar' || ficMode === 'specify')}${(d0.styleRef || '').trim() ? `\n【同人文笔风·优先遵守】:${(d0.styleRef || '').trim()}\n` : ''}${styleHint(d0, true)}\n`
      : `\n本平台这次不要同人文帖。\n`;
    const sys = `你是小红书"发现"页生成器,生成 10 条互不相同的帖子,模仿真实的中文互联网氛围。
${world ? `【世界观/城市背景】(只作为氛围参考,不要照抄,主角不出现):\n${world}\n` : ''}
题材要多元,尽量覆盖这些类型(不要全是同一类,每类最多两三条):
- 吐槽帖(职场/学业/生活/抽象发疯文学,阴阳怪气那种)
- 恋爱/暗恋日记、情感分享(磕到了、纠结、分手)
- 情感分析帖(分析对方心理、"他这样是喜欢我吗"、恋爱脑劝退那种)
- 美食探店、好物分享/种草、穿搭推荐
- 擦边男/擦边女(秀身材、暧昧钓系文案;暧昧撩人但【不写露骨性行为】,点到为止)
- 卖货/带货(软广)、求助帖("在线等")
- 小说同人文/嗑CP(见下面专门要求)
${prefsLine}${likedLine}${ficLine}要求:
1. 这些都是【路人网友】发的,跟主角剧情无关,不要提"${d0.userName}"或主角(同人文除非主角来源选了"嗑我和char")
2. 每条带: type("text"/"image";同人文、纯文字用 text,擦边/穿搭/探店/卖货多用 image)、author(网名)、title(<25字,够吸睛)、coverText、content(普通帖50~120字;同人文${ficWMin}~${ficWMax}字)、tags(同人文必给,其他可空)
   ★coverText 规则:【配图帖(image)】的 coverText 要写成"这张配图的【画面内容描述】",即图里是什么,例如"健身房镜子自拍,腹肌出镜""一桌火锅俯拍""穿搭全身镜自拍";【不要】写成标题口号或心里话。【纯文字帖(text)】的 coverText 才是大字标语句。
3. 每条预生成 2~4 条评论(comments),风格真实:捧场/玩梗神人/也可阴阳怪气泼冷水。comment 里不要出现"${d0.userName}"
4. 10 条题材尽量不重复${npcVoiceSeed()}${antiCliche}${avoidLine}
${xhsNameRule()}${memeHint(d0)}${toneHint(d0) + xhsNpcStyleLine(d0)}${styleHint(d0, false)}
严格 JSON,不要解释:
{"posts":[{"type":"text或image或chat","author":"网名","title":"...","coverText":"...","content":"...","tags":["tag"],"chatlog":[{"side":"l或r","name":"昵称","text":"..."}],"comments":[{"author":"网名","text":"评论"}]}]}\n(chatlog 只在 type=chat 的恋爱日记帖给,其它帖不要这个字段)`;
    const raw = await callXhsAPI(sys + storyTimeAsk(d0), '生成 10 条多元化的小红书帖子,含指定数量的同人文短文,各自带评论');
    if (!raw) { toastr.error('生成失败:模型这次没返回内容,稍等再点一次🔄'); return; }
    const json = tryParseJSON(raw, { posts: [] });
    const d = loadData();
    applyAutoStoryTime(d, json);
    const newPosts = (json.posts || []).map((p, i) => {
      const tops = (p.comments || [])
        .filter(c => c.author && c.author !== d.userName)
        .map((c, ci) => ({
          id: uid(), author: c.author, text: c.text || '',
          likes: Math.floor(Math.random() * 80), liked: false,
          time: Date.now() - Math.floor(Math.random() * 7200000),
          location: pickLoc(), first: ci === 0, replies: [],
        }));
      const type = p.type === 'text' ? 'text' : (p.type === 'chat' ? 'chat' : 'image');
      let chatlog = null, ficChat = false, charNm = '';
      if (type === 'chat' && Array.isArray(p.chatlog)) {
        ficChat = true;
        chatlog = p.chatlog.slice(0, 16).map(x => ({
          role: (x.side === 'r' || x.side === 'right') ? 'user' : 'char',
          name: String(x.name || '').slice(0, 8),
          text: String(x.text || '').trim(),
        })).filter(x => x.text);
        charNm = (chatlog.find(x => x.role === 'char') || {}).name || '';
      }
      return {
        id: uid(),
        author: p.author || '匿名',
        type,
        bg: (type === 'text' || type === 'chat') ? pickTextBg() : null,
        title: p.title || '',
        coverText: p.coverText || '',
        content: p.content || '',
        chatlog, ficChat, charName: charNm,
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
        time: Date.now() - i * 60000 - Math.floor(Math.random() * 3600000),
        st: stStamp(d),
        likes: Math.floor(Math.random() * 9000) + 100,
        comments: tops,
      };
    });
    // 保留旧帖子,新帖子放前面,去重,封顶 40 条
    if (!newPosts.length) { toastr.warning('这次没解析出帖子(模型可能没按格式回),再点一次🔄试试'); return; }
    const prev = (d.feed || []);
    const seen = new Set(newPosts.map(p => p.title + '|' + p.author));
    const kept = prev.filter(p => !seen.has((p.title || '') + '|' + (p.author || '')));
    d.feed = [...newPosts, ...kept].slice(0, 40);
    d.feedFetchTime = Date.now();
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 新增 ${newPosts.length} 条,共 ${d.feed.length} 条`);
  }

  // 同人文专区:单独生成,篇数少、字数保底更长、强制每篇展开成完整故事
  async function genFicZone() {
    const d0 = loadData();
    const n = (d0.ficRatio | 0) > 0 ? Math.min(d0.ficRatio | 0, 4) : 2;
    toastr.info(`正在写 ${n} 篇同人文…`);
    // 专区字数:在用户设定基础上抬高下限,保证能展开成真正的故事(不低于约600字)
    const wMin = Math.max((d0.ficWordMin | 0) || 600, 200);
    const wMax = Math.max((d0.ficWordMax | 0) || 1000, wMin + 200);
    const ficMode = d0.ficChars || 'random';
    const ficPrefsVal = (d0.ficPrefs || '').trim() || (d0.feedPrefs || '').trim();
    const world = getWorldSetting();
    const ficCharsRule = (ficMode === 'uchar')
      ? `主角【固定】用「${d0.userName}」和「${getCharName()}」这一对(就当平台上有人在嗑你俩,可第一或第三人称)`
      : `主角是【一对全新虚构的路人 CP】:必须给他们起【虚构的人名】,跟你的世界书设定、角色卡、主线里的任何人物、以及「${d0.userName}」「${getCharName()}」本人【都完全无关、别影射、别套用他们的关系】。⚠️【就算用日记体/聊天体/书信体这种第一人称】,里面那个「我」也是【虚构角色】(有自己的名字和身份),【绝不是楼主本人、也不是在写楼主自己的恋爱】;聊天体里的 name 用虚构昵称、【别用「${d0.userName}」或「${getCharName()}」】`;
    let ucharRoleLine = '';
    if (ficMode === 'uchar') {
      const cr = getRoleDesc(); const ub = (d0.userBio || '').trim(); const parts = [];
      if (cr) parts.push(`「${getCharName()}」的人设/性格/说话习惯(写到 ta 时严格贴合原人设、别 OOC):${cr}`);
      if (ub) parts.push(`「${d0.userName}」的资料:${ub}`);
      if (parts.length) ucharRoleLine = `\n【这几篇嗑的是「${d0.userName}」×「${getCharName()}」,按下面真实人设来写、别把人写崩】:\n${parts.join('\n')}\n`;
    }
    // 梗池避重抽取(和首页共用 ficMemesUsed 记录)
    const pool = (d0.ficMemes || '').split('\n').map(s => s.trim()).filter(Boolean);
    let memeLine = '', usedToPersist = null;
    if (pool.length) {
      const needed = Math.min(Math.max(n, 2), pool.length);
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let used = Array.isArray(d0.ficMemesUsed) ? d0.ficMemesUsed.filter(m => pool.includes(m)) : [];
      let chosen = shuffle(pool.filter(m => !used.includes(m))).slice(0, needed);
      if (chosen.length < needed) { const rest = shuffle(pool.filter(m => !chosen.includes(m))); chosen = chosen.concat(rest.slice(0, needed - chosen.length)); used = []; }
      const newUsed = used.concat(chosen);
      usedToPersist = (newUsed.length >= pool.length) ? [] : newUsed;
      memeLine = `\n【这一批每篇各取一个下面的梗/桥段作为故事核心,一篇一个、别重复用同一个,也别用没列出的烂大街套路;可改写/组合/换角度,但每篇的核心桥段要落在这些里】:\n- ${chosen.join('\n- ')}\n`;
    }
    if (usedToPersist !== null) { try { const du = loadData(); du.ficMemesUsed = usedToPersist; await saveData(du); } catch (e) {} }
    const FIC_FORMATS = {
      prose: `普通短篇小说(${wMin}~${wMax}字,有场景、有情节推进、有对话、有情绪起伏)`,
      letter: '书信体(一两封往来书信/情书,有称呼/正文/落款,完整写透一段心事或一件事)',
      diary: '日记体(第一人称,完整记录和对方相关的一天/一件事,有细节有情绪)',
      qa100: 'CP相性100问(挑 10~18 个问题,用 "Q:…\\nA:…" 一问一答,借问答把这对 CP 的相处和故事讲出来,可甜可虐)',
      chat: '微信聊天体(type 设为 "chat":content 写一段较完整的第一人称恋爱日记/碎碎念,再给 chatlog 是两人来回的对话,side 用 "l"/"r" 区分左右,name 给昵称,可二三十条,把一段互动【完整演出来】、有起承转合)',
    };
    let selFmts = (Array.isArray(d0.ficFormats) ? d0.ficFormats : ['prose', 'chat']).filter(k => FIC_FORMATS[k]);
    if (!selFmts.length) selFmts = ['prose'];
    const fmtDesc = selFmts.map(k => `「${FIC_FORMATS[k]}」`).join('、');
    const sys = `你是一个同人文/CP 短篇作者,要为一个"同人文专区"写 ${n} 篇【互不相同、各自独立完整】的同人文短篇。
${world ? `【世界观/背景】(只作氛围参考、别照抄,主角不出现):\n${world}\n` : ''}${ficPrefsVal ? `【题材偏好】请贴合:${ficPrefsVal}。\n` : ''}这些同人文的${ficCharsRule}。${ucharRoleLine}${memeLine}
【体裁】从下面勾选的里【每篇随机取、尽量各不相同、轮着换】,不要用没列出的体裁:${fmtDesc}。${selFmts.includes('chat') ? '用"微信聊天体"的那篇按上面说的给 chatlog。' : ''}
🚨【最重要·必须真正展开成故事,绝不许只点题】:每一篇都要是一个【完整的小故事】——有铺垫、有具体场景、有情节推进、有人物对话、有情绪起伏、有收尾。把那个梗/桥段当成故事的【核心事件演出来】,而不是一句话概括。【绝对禁止】只写个梗概、只提一下设定、只点一句题就草草结束、或泛泛叙述带过。宁可把一个梗写透写满,也不要蜻蜓点水。非聊天体的正文请写够 ${wMin}~${wMax} 字。
【未成年角色绝对不可以,只写成年人;可暧昧虐心擦边,但不写露骨性行为细节。】${(d0.styleRef || '').trim() ? `\n【同人文笔风·优先遵守】:${(d0.styleRef || '').trim()}\n` : ''}${styleHint(d0, true)}
每篇给:type("text"或"chat")、author(写手网名)、title(<25字,够吸引人)、coverText(一句话简介/钩子)、content(正文,按体裁写;聊天体则是开头那段恋爱日记)、tags(["骨科","酸涩","HE"] 这种)、chatlog(仅 chat 体给)。
严格 JSON,不要解释:
{"fics":[{"type":"text或chat","author":"网名","title":"...","coverText":"...","content":"...","tags":["tag"],"chatlog":[{"side":"l或r","name":"昵称","text":"..."}]}]}\n(chatlog 只在 type=chat 时给)`;
    const raw = await callXhsAPI(sys + storyTimeAsk(d0), `写 ${n} 篇真正展开的同人文短篇`, { noContext: true });
    if (!raw) { toastr.warning('同人文没生成出来。若提示 bad request,多半是①API 把同人文内容(骨科/禁忌/擦边等)风控拦了,或②上下文太长——可换个模型/中转、调低篇数和字数、或精简梗池/世界书后再试', '', { timeOut: 9000 }); return; }
    const json = tryParseJSON(raw, { fics: [] });
    const d = loadData();
    applyAutoStoryTime(d, json);
    const newFics = (json.fics || []).slice(0, 6).map((p, i) => {
      const type = p.type === 'chat' ? 'chat' : 'text';
      let chatlog = null, ficChat = false, charNm = '';
      if (type === 'chat' && Array.isArray(p.chatlog)) {
        ficChat = true;
        chatlog = p.chatlog.slice(0, 30).map(x => ({
          role: (x.side === 'r' || x.side === 'right') ? 'user' : 'char',
          name: String(x.name || '').slice(0, 8), text: String(x.text || '').trim(),
        })).filter(x => x.text);
        charNm = (chatlog.find(x => x.role === 'char') || {}).name || '';
      }
      return {
        id: uid(), author: p.author || '匿名', type, isFic: true,
        bg: pickTextBg(), title: p.title || '无题', coverText: p.coverText || '',
        content: p.content || '', chatlog, ficChat, charName: charNm,
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
        time: Date.now() - i * 60000, st: stStamp(d),
        likes: Math.floor(Math.random() * 9000) + 100, comments: [],
      };
    });
    // 追加式:新写的放最前,保留旧的,按 标题|作者 去重,封顶 40 篇
    const prev = (d.ficFeed || []);
    const seen = new Set(newFics.map(p => (p.title || '') + '|' + (p.author || '')));
    const kept = prev.filter(p => !seen.has((p.title || '') + '|' + (p.author || '')));
    d.ficFeed = [...newFics, ...kept].slice(0, 40);
    d.ficFetchTime = Date.now();
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 新增 ${newFics.length} 篇,共 ${d.ficFeed.length} 篇`);
  }

  // ============ 帖子详情 ============
  function renderPostView(d) {
    const id = d.routeContext.postId;
    const post = findPost(d, id);
    if (!post) return notFoundScreen('帖子不见了(可能刷新后被替换了)', 'feed', 'feed');
    const isMine = (d.myPosts || []).some(p => p.id === id);
    const authorDisp = isMine ? (d.userName || post.author || '匿名') : (post.author || '匿名');
    const authorChar = (post.author || '匿')[0];
    const authorColor = randomColor(post.author || 'x');
    const followed = isFollowing(d, post.author);
    const tops = ensureThreaded(post);
    const total = countComments(tops);
    const expanded = d.routeContext.expanded || [];
    const cmtSelMode = !!d.routeContext.cmtSelMode;
    const cmtSel = d.routeContext.cmtSel || [];
    const cmtMenuCid = d.routeContext.cmtMenuCid;

    const renderOne = (c, isReply) => {
      const cColor = randomColor(c.author || 'x');
      const cAvUrl = ((c._mine || c.author === d.userName) && d.userAvatar) ? d.userAvatar : '';
      const liked = !!c.liked;
      const isAuthor = c.author === post.author;
      const badges = `${esc(c.author)}${isCharAcct(c.author, d) ? charBadge() : ''}${isAuthor ? '<span class="xhs-c-badge-author">作者</span>' : ''}${c.reply_to ? `<span class="xhs-c-replyto"> 回复 </span><span class="xhs-c-name">${esc(c.reply_to)}</span>` : ''}`;
      // 多选删除模式:整条可点选,加勾选框,隐藏回复/点赞等操作
      if (cmtSelMode) {
        const on = cmtSel.includes(c.id);
        return `
        <div class="xhs-c-item ${isReply ? 'xhs-c-reply-item' : ''} xhs-c-selrow ${on ? 'xhs-c-selon' : ''}" data-action="cmt-sel-toggle" data-cid="${c.id}">
          <span class="xhs-c-selbox">${on ? '✓' : ''}</span>
          <div class="xhs-c-avatar">${avatarFor(d, c.author, { bg: cColor, url: cAvUrl })}</div>
          <div class="xhs-c-body">
            <div class="xhs-c-author">${badges}</div>
            <div class="xhs-c-text">${emojifyXhs(esc(c.text))}</div>
            ${c.sticker ? `<img class="xhs-c-sticker" src="${esc(c.sticker)}" alt="表情"/>` : ''}
          </div>
        </div>`;
      }
      const delMenu = (cmtMenuCid === c.id)
        ? `<div class="xhs-c-delmenu"><button data-action="del-comment" data-id="${post.id}" data-cid="${c.id}">删除</button><button data-action="cmt-multi" data-id="${post.id}" data-cid="${c.id}">多选</button></div>`
        : '';
      return `
        <div class="xhs-c-item ${isReply ? 'xhs-c-reply-item' : ''}" data-cid="${c.id}">
          <div class="xhs-c-avatar">${avatarFor(d, c.author, { bg: cColor, url: cAvUrl })}</div>
          <div class="xhs-c-body">
            <div class="xhs-c-author">${badges}</div>
            ${c.text ? `<div class="xhs-c-text">${emojifyXhs(esc(c.text))}</div>` : ''}
            ${c.img ? `<div class="xhs-c-img"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#bbb" stroke-width="1.4"/><circle cx="8" cy="10" r="1.5" fill="#bbb"/><path d="M3 17l5-5 4 4 3-3 6 6" stroke="#bbb" stroke-width="1.4" fill="none"/></svg><span>${esc(c.img)}</span></div>` : ''}
            ${c.sticker ? `<img class="xhs-c-sticker" src="${esc(c.sticker)}" alt="表情"/>` : ''}
            <div class="xhs-c-actions">
              <span class="xhs-c-time">${stTimeLabel(d, c)}</span>
              ${c.first ? '<span class="xhs-c-first">首评</span>' : ''}
              <button class="xhs-c-reply-btn" data-action="reply-comment" data-id="${post.id}" data-cid="${c.id}" data-name="${esc(c.author)}">回复</button>
              ${(() => {
                const isUserC = c.author === d.userName;
                const isCharC = isCharAcct(c.author, d);
                const isCharPostV = post.author === charDisplayName(d);
                const isUserPostV = isMine || post.author === d.userName;
                const isOtherPostV = !isCharPostV && !isUserPostV;   // 路人(NPC)发的帖
                const show = (!isReply && !isUserC && !isCharC)      // 路人的顶层评论
                  || isCharC                                          // char 的任何评论/回复 → 让 ta 接着说
                  || (isCharPostV && isUserC)                         // char 帖子下你自己的评论 → 召唤 char 回你
                  || (isOtherPostV && isUserC && !isReply);           // 路人帖下你自己的评论 → 召唤帖主回你
                if (!show) return '';
                const ttl = isUserC
                  ? (isOtherPostV ? `让帖主「${esc(post.author)}」回复你` : `让 ${esc(charDisplayName(d))} 回复你`)
                  : (isCharC ? `让 ${esc(c.author)} 接着说` : (isOtherPostV ? `让帖主「${esc(post.author)}」回复 ${esc(c.author)}` : `让 ${esc(c.author)} 回复你(可能引来其他人接话)`));
                return `<button class="xhs-c-regen-btn" data-action="regen-cmt-reply" data-id="${post.id}" data-cid="${c.id}" title="${ttl}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 0114-5l2 2"/><path d="M20 4v4h-4"/><path d="M20 13a8 8 0 01-14 5l-2-2"/><path d="M4 20v-4h4"/></svg></button>`;
              })()}
            </div>
            ${delMenu}
          </div>
          <button class="xhs-c-like ${liked ? 'xhs-c-liked' : ''}" data-action="like-comment" data-id="${post.id}" data-cid="${c.id}">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${liked ? '#ff2442' : 'none'}" stroke="${liked ? '#ff2442' : '#999'}" stroke-width="1.5" stroke-linejoin="round"/></svg>
            <span>${c.likes ? formatLikes(c.likes) : ''}</span>
          </button>
        </div>`;
    };

    const comments = tops.map(t => {
      const reps = t.replies || [];
      const isOpen = expanded.includes(t.id);
      let repHtml = '';
      if (reps.length) {
        if (isOpen) {
          repHtml = `<div class="xhs-c-replies">${reps.map(r => renderOne(r, true)).join('')}` +
            `<button class="xhs-c-expand" data-action="toggle-thread" data-id="${post.id}" data-cid="${t.id}">收起</button></div>`;
        } else {
          repHtml = `<div class="xhs-c-replies"><button class="xhs-c-expand" data-action="toggle-thread" data-id="${post.id}" data-cid="${t.id}">— 展开 ${reps.length} 条回复</button></div>`;
        }
      }
      return renderOne(t, false) + repHtml;
    }).join('');

    const replyName = d.routeContext.replyToName;
    const cmtSelBar = `
      <div class="wx-sel-bar">
        <button class="xhs-icon-btn" data-action="cmt-sel-cancel" style="font-size:14px;width:auto;padding:0 8px">取消</button>
        <span>已选 ${cmtSel.length} 条评论</span>
        <button class="xhs-publish-btn" data-action="cmt-sel-confirm" data-id="${post.id}" style="background:#ff2442${cmtSel.length ? '' : ';opacity:.5'}" ${cmtSel.length ? '' : 'disabled'}>删除(${cmtSel.length})</button>
      </div>`;

    return `
      <div class="xhs-topbar xhs-view-top">
        <button class="xhs-icon-btn" data-action="view-back">‹</button>
        <div class="xhs-view-author" data-action="open-user" data-name="${esc(authorDisp)}">
          <div class="xhs-card-avatar xhs-view-avatar">${avatarFor(d, authorDisp, { bg: authorColor, url: (isMine && d.userAvatar) ? d.userAvatar : '' })}</div>
          <span class="xhs-view-author-name">${esc(authorDisp)}${isCharAcct(authorDisp, d) ? charBadge() : ''}</span>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${isMine ? `<button class="xhs-del-btn" data-action="del-post" data-id="${post.id}">删除</button>` : `<button class="xhs-follow-btn ${followed ? 'xhs-followed' : ''}" data-action="${followed ? 'unfollow-user' : 'follow-user'}" data-name="${esc(post.author)}">${followed ? '已关注' : '关注'}</button><button class="xhs-del-btn" data-action="del-post" data-id="${post.id}">删除</button>`}
          <button class="xhs-icon-btn" data-action="forward-post" data-id="${post.id}" title="转发"><svg viewBox="0 0 24 24" fill="none"><path d="M14 4l7 6-7 6v-3.5C9 12.5 6 14 4 19c-.5-6 2.5-10 10-10.5V4z" stroke="#333" stroke-width="1.7" stroke-linejoin="round"/></svg></button>
        </div>
      </div>
      <div class="xhs-scroll xhs-view-scroll">
        ${detailCover(post)}
        <div class="xhs-post-body">
          <div class="xhs-post-title">${esc(post.title)}</div>
          <div class="xhs-post-content">${esc(post.content)}</div>
          ${(post.tags && post.tags.length) ? `<div class="xhs-post-tags">${post.tags.map(t => `<span class="xhs-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="xhs-post-meta">${stTimeLabel(d, post)} · ${formatLikes(post.likes || 0)} 赞 · ${total} 评论</div>
        </div>
        <div class="xhs-post-tools">
          <button class="xhs-tool-btn" data-action="edit-post-body" data-id="${post.id}" title="编辑正文">
            <svg viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5l4 4M4 20l1-4L16 5l3 3L8 19l-4 1z" stroke="#7c8aa0" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>
          </button>
          <button class="xhs-tool-btn" data-action="gen-comments" data-id="${post.id}" title="${total ? '再生成一轮评论' : '生成大家的评论'}">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" fill="#7c8aa0"/><circle cx="18" cy="17" r="2.4" stroke="#7c8aa0" stroke-width="1.4"/><path d="M18 15.6v2.8M16.6 17h2.8" stroke="#7c8aa0" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
          ${isMine ? `<button class="xhs-tool-btn" data-action="boost-group" data-id="${post.id}" title="把热度导进我的粉丝群">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c8aa0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.5 2.5-1.5 3.8-1.5 6 0 1 .6 1.7 1.5 1.7s1.4-.8 1.3-1.8c1.4 1 2.2 2.6 2.2 4.3a5.5 5.5 0 11-9.6-3.7C7.2 8.3 9.5 7 9.2 3.8c1.5.7 2.5 1.6 2.8-.8z"/></svg>
          </button>` : ''}
          ${isMine && d.charSeesPosts && !isMultiCast(d) ? `<button class="xhs-tool-btn" data-action="react-as-char" data-id="${post.id}" title="让 ${esc(charDisplayName(d))} 刷到并回应这篇">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c8aa0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5C6.5 16.5 3 13.4 3 9.2 3 6.4 5.2 4.5 7.6 4.5c1.6 0 3.2.8 4.4 2.3 1.2-1.5 2.8-2.3 4.4-2.3C18.8 4.5 21 6.4 21 9.2c0 4.2-3.5 7.3-9 11.3z"/></svg>
          </button>` : ''}
          ${(post.author === charDisplayName(d) || (isMine && d.charSeesPosts)) && !isMultiCast(d) ? `<button class="xhs-tool-btn" data-action="char-reply-comments" data-id="${post.id}" title="让 ${esc(charDisplayName(d))} 回评论区(楼主必回+挑几条路人)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c8aa0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 01-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z"/><path d="M12.5 8.5L10 11l2.5 2.5"/><path d="M10 11h3.2a2.3 2.3 0 012.3 2.3v.4"/></svg>
          </button>` : ''}
          ${isMultiCast(d) && (isMine || post.author === charDisplayName(d) || post.isCast || post.castId) ? `<button class="xhs-tool-btn" data-action="cast-react-open" data-id="${post.id}" title="让出场角色回应这帖(评论 / 回评论区)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c8aa0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0111 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 19a4.5 4.5 0 016-4.2"/></svg>
          </button>` : ''}
        </div>
        <div class="xhs-comment-section">
          <div class="xhs-c-title">共 ${total} 条评论${cmtSelMode ? ' · 点选要删除的' : ''}</div>
          ${comments || '<div class="xhs-c-empty">来发表第一条评论吧</div>'}
        </div>
        <div style="height:8px"></div>
      </div>
      ${d.routeContext.forwarding === post.id ? buildForwardSheet(d, post.id) : ''}
      ${d.routeContext.castReact === post.id ? buildCastReactSheet(d, post.id) : ''}
      ${!cmtSelMode && replyName ? `<div class="xhs-reply-bar">正在回复 <b>@${esc(replyName)}</b><button class="xhs-reply-cancel" data-action="cancel-reply" data-id="${post.id}">✗</button></div>` : ''}
      ${!cmtSelMode && d.routeContext.pendingCommentImg ? `<div class="xhs-reply-bar">📷 已附图: ${esc(d.routeContext.pendingCommentImg.slice(0, 24))}…<button class="xhs-reply-cancel" data-action="clear-cimg" data-id="${post.id}">✗</button></div>` : ''}
      ${!cmtSelMode && d.routeContext.pendingCommentSticker ? `<div class="xhs-reply-bar">😀 已选表情 <img src="${esc(d.routeContext.pendingCommentSticker.url)}" style="width:26px;height:26px;vertical-align:middle;border-radius:5px;margin:0 4px;object-fit:cover"/><button class="xhs-reply-cancel" data-action="clear-csticker" data-id="${post.id}">✗</button></div>` : ''}
      ${!cmtSelMode && d.routeContext.commentStickerOpen ? ((d.stickers || []).length
        ? `<div class="xhs-sticker-tray">${(d.stickers || []).map(s => `<img class="xhs-sticker-pick" src="${esc(s.url)}" title="${esc(s.name)}" data-action="comment-pick-sticker" data-id="${post.id}" data-url="${esc(s.url)}" data-name="${esc(s.name)}"/>`).join('')}</div>`
        : `<div class="xhs-set-help" style="padding:8px 14px">还没有表情包,去 设置→😀自定义表情包 添加</div>`) : ''}
      ${cmtSelMode ? cmtSelBar : `<div class="xhs-c-bottom-input">
        <button class="xhs-post-like ${post.likedByMe ? 'xhs-post-liked' : ''}" data-action="like-post" data-id="${post.id}" title="点赞">
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${post.likedByMe ? '#ff2442' : 'none'}" stroke="${post.likedByMe ? '#ff2442' : '#888'}" stroke-width="1.7" stroke-linejoin="round"/></svg>
        </button>
        <button class="xhs-post-like" data-action="comment-img" data-id="${post.id}" title="加图片">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#888" stroke-width="1.6"/><circle cx="8.5" cy="10" r="1.6" fill="#888"/><path d="M4 17l5-5 4 4 3-3 4 4" stroke="#888" stroke-width="1.6" fill="none"/></svg>
        </button>
        <button class="xhs-post-like" data-action="comment-sticker-toggle" data-id="${post.id}" title="表情包">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#888" stroke-width="1.6"/><circle cx="9" cy="10" r="1.1" fill="#888"/><circle cx="15" cy="10" r="1.1" fill="#888"/><path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" stroke="#888" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <input id="xhs-c-input" placeholder="${replyName ? '回复 @' + esc(replyName) : '说点什么...'}"/>
        <button class="xhs-c-send" data-action="comment-send" data-id="${post.id}">发送</button>
      </div>`}
    `;
  }

  // 给帖子点赞/取消;点赞会把这篇的口味信号记下来,影响以后的推荐
  async function likePost(postId) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    post.likedByMe = !post.likedByMe;
    post.likes = (post.likes || 0) + (post.likedByMe ? 1 : -1);
    if (post.likedByMe) {
      d.likedSignals = d.likedSignals || [];
      const sig = [(post.title || '').slice(0, 18), ...(post.tags || [])].filter(Boolean).join(' ');
      if (sig) {
        d.likedSignals = d.likedSignals.filter(s => s !== sig);
        d.likedSignals.push(sig);
        if (d.likedSignals.length > 30) d.likedSignals = d.likedSignals.slice(-30);
      }
    }
    await saveData(d);
    refreshXhs();
  }

  // 把"{{user}}回复某条评论"暂存起来,等 NPC 回复后和回复打包成一条主线消息(少占楼层)
  // 注入主线时引用帖子:谁发的 + 标题 + 完整正文(图帖带配图描述),让主线 AI 有完整上下文
  function postRef(p, d, noWho) {
    if (!p) return '某条笔记';
    d = d || loadData();
    const c = (p.content || '').trim();
    let inner = '';
    if (p.type === 'image' && p.coverText) inner += `配图:${p.coverText}` + (c ? ';' : '');
    else if (p.type === 'chat' && p.chatlog) inner += `聊天截图:${p.chatlog.map(x => `${x.role === 'user' ? '楼主' : (p.charName || 'TA')}:${x.text || ''}`).join('/').slice(0, 300)}` + (c ? ';' : '');
    if (c) inner += `正文:${c}`;
    const body = `笔记《${p.title || '帖子'}》${inner ? `(${inner})` : ''}`;
    if (noWho) return body;
    const who = isCharAcct(p.author, d) ? '{{char}}' : (p.author === d.userName ? '{{user}}' : `网友「${p.author || '匿名'}」`);
    return `${who}发的${body}`;
  }
  // 按 cid 找到它所在的顶层楼层(cid 可能是顶层评论或楼中楼回复)
  function findThread(tops, cid) {
    for (const t of (tops || [])) {
      if (t.id === cid) return { top: t, c: t };
      for (const r of (t.replies || [])) if (r.id === cid) return { top: t, c: r };
    }
    return null;
  }
  async function flushPendingCommentSync(d, post, npcLines, cidFilter, tail) {
    const pend = post._pendingCmtSync || [];
    const mine = cidFilter ? pend.filter(p => p.cid === cidFilter) : pend.slice();
    if (!mine.length) return false;
    post._pendingCmtSync = cidFilter ? pend.filter(p => p.cid !== cidFilter) : [];
    const userPart = mine.map(p => p.to ? `{{user}}回复@${p.to}「${p.text}${p.extra || ''}」` : `{{user}}评论「${p.text}${p.extra || ''}」`).join('；');
    const npcPart = (npcLines && npcLines.length) ? `;${npcLines.join('；')}` : '';
    await syncToMain(`[小红书]${postRef(post)} 评论区互动:${userPart}${npcPart}${tail || ''}`, d.syncHidden);
    return true;
  }

  async function sendComment(postId) {
    const text = readInputCache('xhs-c-input');
    const d = loadData();
    const pendingImg = d.routeContext.pendingCommentImg || '';
    const pendingSticker = d.routeContext.pendingCommentSticker || null;
    if (!text && !pendingImg && !pendingSticker) return toastr.info('请先输入评论、加张图或选个表情');
    const post = findPost(d, postId);
    if (!post) return;
    const tops = ensureThreaded(post);
    const replyTo = d.routeContext.replyToName || undefined;
    const newC = { id: uid(), author: d.userName, reply_to: replyTo, text: text || '', img: pendingImg || null, sticker: pendingSticker ? pendingSticker.url : null, likes: 0, liked: false, time: Date.now(), st: stStamp(d), location: '英国', _mine: true };
    let topId = null;
    if (replyTo) {
      const flat = flattenComments(tops);
      const target = flat.find(f => f.c.id === d.routeContext.replyToCid);
      const top = target ? target.top : tops.find(t => t.author === replyTo);
      if (top) { top.replies = top.replies || []; top.replies.push(newC); topId = top.id; if (!d.routeContext.expanded) d.routeContext.expanded = []; if (!d.routeContext.expanded.includes(top.id)) d.routeContext.expanded.push(top.id); }
      else { newC.replies = []; tops.push(newC); }
    } else {
      newC.replies = [];
      tops.push(newC);
    }
    const isMyPost = (d.myPosts || []).some(p => p.id === postId);
    const isCharPost = post.author === charDisplayName(d);
    const extra = `${pendingImg ? '[附图]' : ''}${pendingSticker ? '[表情:' + (pendingSticker.name || '表情') + ']' : ''}`;
    // 暂存条件:在【自己的帖子】里回复某条评论,或在【char 的帖子】里发任何评论
    // → 先不进主线,等 ta(或 NPC)回你时打包成一条
    const threadId = topId || newC.id; // 顶层评论用自己的 id 作楼层 id
    const defer = (isMyPost && replyTo && topId) || isCharPost;
    if (defer) {
      post._pendingCmtSync = post._pendingCmtSync || [];
      post._pendingCmtSync.push({ to: replyTo || '', text: text || '', extra, cid: threadId, time: Date.now() });
    }
    d.routeContext.replyToName = undefined;
    d.routeContext.replyToCid = undefined;
    d.routeContext.pendingCommentImg = undefined;
    d.routeContext.pendingCommentSticker = undefined;
    d.routeContext.commentStickerOpen = false;
    await saveData(d);
    clearInputCache('xhs-c-input');
    refreshXhs();
    // 只有【自己帖子的顶层评论】立即进主线;char 帖子和自己帖子的回复都已暂存,等回复时打包
    if (!defer && isMyPost) {
      await syncToMain(`[小红书] {{user}} 评论了自己的${postRef(post, d, true)}: ${text}${extra}`, d.syncHidden);
    }
  }

  async function commentAddImg(postId) {
    const TOP = getTop();
    const desc = TOP.prompt('图片描述(详细点,这张图里是什么):', '');
    if (desc === null || !desc.trim()) return;
    const d = loadData();
    d.routeContext.pendingCommentImg = desc.trim();
    await saveData(d);
    refreshXhs();
  }
  async function clearCommentImg() {
    const d = loadData();
    d.routeContext.pendingCommentImg = undefined;
    await saveData(d);
    refreshXhs();
  }
  async function commentStickerToggle() {
    const d = loadData();
    d.routeContext.commentStickerOpen = !d.routeContext.commentStickerOpen;
    await saveData(d);
    refreshXhs();
  }
  async function pickCommentSticker(url, name) {
    const d = loadData();
    if (!url) return;
    d.routeContext.pendingCommentSticker = { url, name: name || '表情' };
    d.routeContext.commentStickerOpen = false;
    await saveData(d);
    refreshXhs();
  }
  async function clearCommentSticker() {
    const d = loadData();
    d.routeContext.pendingCommentSticker = undefined;
    await saveData(d);
    refreshXhs();
  }

  // 跟任意陌生人私信:有就打开,没有就建一个
  async function openNpcDm(name) {
    const d = loadData();
    if (!name) return;
    d.dms = d.dms || [];
    let dm = d.dms.find(x => !x.isChar && x.name === name);
    if (!dm) {
      const persona = (d.npcProfiles || {})[name]?.bio || '';
      dm = { id: uid(), name, persona, messages: [], lastTime: Date.now(), unread: false };
      d.dms.unshift(dm);
      await saveData(d);
    }
    await openDm(dm.id);
  }

  // 打开帖子时记住来源页,退出帖子回到原页(而不是首页)
  async function openPostView(id) {
    const d = loadData();
    if (d.currentRoute !== 'view') {
      d.viewBack = { route: d.currentRoute, ctx: { ...(d.routeContext || {}) } };
      await saveData(d);
    }
    await navigate('view', { postId: id });
  }
  async function viewBack() {
    const d = loadData();
    const vb = d.viewBack;
    if (vb && vb.route && vb.route !== 'view') await navigate(vb.route, vb.ctx || {});
    else await navigate('feed');
  }

  // ====== 转发笔记到群/私信(全局) ======
  // 转发的笔记在喂给 AI 的上下文里:按 postId 找到真实帖子,带上标题/作者/正文(或聊天截图内容),保证对方读得到内容
  function shareCtxText(d, m, opts) {
    opts = opts || {};
    const s = m.share || {};
    const p = findPost(d, s.postId);
    const title = s.title || (p && p.title) || '笔记';
    const author = s.author || (p && p.author) || '';
    let body = '';
    if (p) {
      if (p.type === 'chat') body = (p.chatlog || []).map(x => `${x.name || ''}:${x.text || (x.sticker ? '[表情]' : '')}`).filter(Boolean).join(' / ').slice(0, 300);
      else body = (p.content || '').slice(0, 300);
    } else { body = s.snippet || ''; }
    // 评论区:带上前几条(含个别热门回复),让对方也能就评论聊
    let cmts = '';
    if (p && Array.isArray(p.comments) && p.comments.length) {
      const parts = [];
      p.comments.slice(0, 5).forEach(c => {
        const t = `${c.author || ''}:${String(c.text || '').slice(0, 30)}`;
        if (t.length > 1) parts.push(t);
        (c.replies || []).slice(0, 1).forEach(r => { const rt = `${r.author || ''}回${c.author || ''}:${String(r.text || '').slice(0, 24)}`; if (rt.length > 2) parts.push(rt); });
      });
      if (parts.length) cmts = `;评论区(${p.comments.length}条,摘录):${parts.slice(0, 6).join(' | ')}`;
    }
    // 是不是 char 发的笔记;opts.knowChar 为真(微信侧,好友认识 char)时,明确告诉对方作者就是 char
    const byChar = !!(s.isChar || (p && (p.isChar || isCharAcct(p.author, d))));
    const charNote = (opts.knowChar && byChar) ? `(这条笔记的作者 @${author} 就是你们都认识的 {{char}} 本人)` : '';
    return `[转发的小红书笔记 ——《${title}》${author ? ' by @' + author : ''}${charNote}${body ? ',笔记内容:' + body : ''}${cmts}]`;
  }
  function shareCardOf(d, post) {
    return {
      postId: post.id, title: post.title || '笔记', author: post.author || d.userName,
      type: post.type || 'image', coverText: (post.coverText || '').slice(0, 40),
      snippet: (post.content || '').slice(0, 50), isChar: isCharAcct(post.author, d),
    };
  }
  // 多人卡:在自己帖子上选一个出场角色来回应(评论这帖 / 回评论区)。一次点一个,避免一次批量生成多个角色导致超时
  function buildCastReactSheet(d, postId) {
    const _p = findPost(d, postId);
    const _author = _p ? _p.author : '';
    const cast = (d.cast || []).filter(c => c.name !== _author);
    let rows = '';
    cast.forEach(c => {
      const av = avatarFor(d, c.name, { url: c.avatar });
      rows += `
        <div class="xhs-fwd-row" style="cursor:default">
          <div class="xhs-fwd-av">${av}</div>
          <div class="xhs-fwd-info"><div class="xhs-fwd-name">${esc(c.name)}</div><div class="xhs-fwd-sub">${esc((c.persona || '').replace(/\n/g, ' ').slice(0, 18))}</div></div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="xhs-cr-btn" data-action="cast-react-post" data-id="${postId}" data-cid="${c.id}">💬评论</button>
            <button class="xhs-cr-btn" data-action="cast-reply-comments" data-id="${postId}" data-cid="${c.id}">↩️回评论区</button>
          </div>
        </div>`;
    });
    if (!rows) rows = '<div class="xhs-empty" style="padding:24px 12px">还没有出场角色<br/>去 设置 → 🎭出场角色 添加</div>';
    return `
      <div class="xhs-fwd-mask" data-action="cancel-cast-react"></div>
      <div class="xhs-fwd-sheet">
        <div class="xhs-fwd-head"><span>让出场角色回应这帖</span><button class="xhs-fwd-x" data-action="cancel-cast-react">✕</button></div>
        <div style="padding:6px 16px 2px;font-size:11px;color:#999;line-height:1.5">点谁谁就以 ta 的人设来回应。<b>一次点一个</b>,想要多个就多点几次(一次只生成一个角色,更稳)。</div>
        <div class="xhs-fwd-list">${rows}</div>
      </div>`;
  }
  async function openCastReact(postId) {
    const d = loadData();
    d.routeContext = d.routeContext || {};
    d.routeContext.castReact = postId;
    await saveData(d);
    refreshXhs();
  }
  async function cancelCastReact() {
    const d = loadData();
    if (d.routeContext) d.routeContext.castReact = false;
    await saveData(d);
    refreshXhs();
  }
  function buildForwardSheet(d, postId) {
    const dms = d.dms || [], groups = d.groups || [];
    const row = (dest, name, sub, isChar, avHtml) => `
      <div class="xhs-fwd-row" data-action="do-forward" data-id="${postId}" data-dest="${dest}">
        <div class="xhs-fwd-av">${avHtml}</div>
        <div class="xhs-fwd-info"><div class="xhs-fwd-name">${esc(name)}${isChar ? charBadge() : ''}</div><div class="xhs-fwd-sub">${esc(sub)}</div></div>
        <span class="xhs-fwd-go">发送</span>
      </div>`;
    const sec = (label) => `<div style="padding:9px 14px 4px;font-size:12px;color:#999;font-weight:600">${label}</div>`;
    const xDms = dms.filter(x => x.app !== 'wx'), xGroups = groups.filter(g => g.app !== 'wx');
    const wDms = dms.filter(x => x.app === 'wx'), wGroups = groups.filter(g => g.app === 'wx');
    let rows = '';
    if (xDms.length || xGroups.length) {
      rows += sec('小红书');
      xDms.forEach(x => { const nm = x.isChar ? charDisplayName(d) : x.name; rows += row('dm:' + x.id, nm, x.isChar ? '私信对话' : ((x.castId && !x.castAlt) ? '出场角色' : '陌生人私信'), x.isChar, avatarFor(d, nm, { url: x.avatar })); });
      xGroups.forEach(g => { rows += row('group:' + g.id, g.name, (g.memberCount || (g.members || []).length) + ' 人 · 粉丝群', false, avatarHtml(g.avatar, '#5b8fb0', '👥')); });
    }
    if (wDms.length || wGroups.length) {
      rows += sec('微信');
      wDms.forEach(x => { const nm = x.isChar ? charDisplayName(d) : (x.remark || x.name); rows += row('dm:' + x.id, nm, (x.castId && !x.castAlt) ? '出场角色' : '微信好友', x.isChar, avatarFor(d, nm, { url: x.avatar, wx: true })); });
      wGroups.forEach(g => { rows += row('group:' + g.id, g.name, ((g.members || []).length + 1) + ' 人 · 微信群', false, avatarHtml(g.avatar, '#5b8fb0', '👥')); });
    }
    if (!rows) rows = '<div class="xhs-empty" style="padding:24px 12px">还没有可转发的对象<br/>去微信加好友/建群,或去消息页建粉丝群</div>';
    return `
      <div class="xhs-fwd-mask" data-action="cancel-forward"></div>
      <div class="xhs-fwd-sheet">
        <div class="xhs-fwd-head"><span>转发到…</span><button class="xhs-fwd-x" data-action="cancel-forward">✕</button></div>
        <div class="xhs-fwd-list">${rows}</div>
      </div>`;
  }
  async function openForward(postId) {
    const d = loadData();
    d.routeContext = d.routeContext || {};
    d.routeContext.forwarding = postId;
    await saveData(d);
    refreshXhs();
  }
  async function cancelForward() {
    const d = loadData();
    if (d.routeContext) d.routeContext.forwarding = false;
    await saveData(d);
    refreshXhs();
  }
  async function doForward(postId, dest) {
    const d = loadData();
    const post = findPost(d, postId);
    if (d.routeContext) d.routeContext.forwarding = false;
    if (!post || !dest) { await saveData(d); refreshXhs(); return; }
    const card = shareCardOf(d, post);
    const [kind, destId] = String(dest).split(':');
    if (kind === 'group') {
      const g = (d.groups || []).find(x => x.id === destId);
      if (!g) { await saveData(d); refreshXhs(); return; }
      g.chat.push({ role: 'me', name: d.userName, kind: 'share', share: card, time: Date.now(), st: stStamp(d) });
      g.lastTime = Date.now();
      d.currentApp = g.app === 'wx' ? 'wx' : 'xhs';
      await saveData(d);
      toastr.success(`✓ 已转发到「${g.name}」`);
      await navigate('group-chat', { groupId: destId });
      return;
    }
    const dm = (d.dms || []).find(x => x.id === destId);
    if (!dm) { await saveData(d); refreshXhs(); return; }
    dm.messages.push({ role: 'me', kind: 'share', share: card, time: Date.now(), st: stStamp(d) });
    dm.lastTime = Date.now(); dm.unread = false;
    d.currentApp = dm.app === 'wx' ? 'wx' : 'xhs';
    await saveData(d);
    toastr.success(`✓ 已转发给「${dm.isChar ? charDisplayName(d) : (dm.remark || dm.name)}」`);
    if (dm.app === 'wx') await navigate('dm-chat', { dmId: dm.id });
    else if (dm.isChar) await openCharDm();
    else await navigate('dm-chat', { dmId: dm.id });
  }

  function findPost(d, postId) {
    let p = (d.myPosts || []).find(x => x.id === postId) || (d.feed || []).find(x => x.id === postId) || (d.ficFeed || []).find(x => x.id === postId);
    if (p) return p;
    const profs = d.npcProfiles || {};
    for (const k in profs) {
      const hit = (profs[k].posts || []).find(x => x.id === postId);
      if (hit) return hit;
    }
    return null;
  }
  function findCommentById(post, cid) {
    const flat = flattenComments(ensureThreaded(post));
    const hit = flat.find(f => f.c.id === cid);
    return hit ? hit.c : null;
  }

  // 给单条评论点赞/取消(顶层或楼中楼都行)
  async function likeComment(postId, cid) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    const c = findCommentById(post, cid);
    if (!c) return;
    if (c.liked) { c.liked = false; c.likes = Math.max(0, (c.likes || 0) - 1); }
    else { c.liked = true; c.likes = (c.likes || 0) + 1; }
    await saveData(d);
    refreshXhs();
  }

  // 点"回复"→ 设置回复目标
  async function replyToComment(postId, cid, name) {
    const d = loadData();
    d.routeContext.replyToName = name;
    d.routeContext.replyToCid = cid;
    await saveData(d);
    refreshXhs();
    const inp = getTop().document.getElementById('xhs-c-input');
    if (inp) inp.focus();
  }

  async function cancelReply(postId) {
    const d = loadData();
    d.routeContext.replyToName = undefined;
    d.routeContext.replyToCid = undefined;
    await saveData(d);
    refreshXhs();
  }

  // 展开/收起某楼的回复
  async function toggleThread(postId, cid) {
    const d = loadData();
    d.routeContext.expanded = d.routeContext.expanded || [];
    const i = d.routeContext.expanded.indexOf(cid);
    if (i >= 0) d.routeContext.expanded.splice(i, 1);
    else d.routeContext.expanded.push(cid);
    await saveData(d);
    refreshXhs();
  }

  // 单条评论的「刷新回复」:让这条评论的人针对楼主回复你,看到认同的别人也可能随机接话
  async function regenCommentReply(postId, cid) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    const tops = ensureThreaded(post);
    const th = findThread(tops, cid);
    if (!th) return;
    const top = th.top, clicked = th.c;
    const cname = charDisplayName(d);
    const userName = d.userName;
    const isCharPost = post.author === cname;
    // 走"char 回复"路径:点的是 char 自己的评论(接着说),或在 char 帖子下点了你自己的评论(召唤 char 回你)
    const charReply = isCharAcct(clicked.author, d) || (isCharPost && clicked.author === userName);
    const thread = [top, ...(top.replies || [])];
    const threadText = thread.map(x => `${x.author}${x.reply_to ? '(回复' + x.reply_to + ')' : ''}: ${x.text || ''}${x.img ? `[ta发了一张图·画面:${String(x.img).slice(0, 60)}]` : (x.sticker ? '[表情]' : '')}`).join('\n');
    const postCtx = post.type === 'chat' && post.chatlog
      ? `帖子是聊天记录截图:\n${post.chatlog.map(x => `${x.role === 'user' ? '楼主' : (post.charName || 'TA')}: ${x.text || (x.sticker ? '[表情]' : x.img ? '[图片]' : '')}`).join('\n')}`
      : post.type === 'image'
        ? `帖子是【图片笔记】(带图,不是纯文字):标题「${post.title}」,配图画面「${(post.coverText || post.title || '').trim()}」,正文「${post.content}」${(post.tags && post.tags.length) ? `,话题:${post.tags.map(t => '#' + String(t).replace(/^#/, '')).join(' ')}` : ''}。回应的人是在【看这张图】,要当成在评论一张照片(画面里的人/物/场景/穿搭/氛围),别把画面描述当成楼主打的文字逐字回。`
        : `帖子标题「${post.title}」 正文「${post.content}」${(post.tags && post.tags.length) ? ` 话题:${post.tags.map(t => '#' + String(t).replace(/^#/, '')).join(' ')}` : ''}(评论要结合【标题+正文】整体理解,别忽略标题;正文写"如题"时意思在标题里)`;

    let sys, raw;
    const knows = d.charKnowsAlt === 'knows';
    const isUserPost = post.author === userName;
    const owner = post.author;
    const ownerReply = !charReply && !isCharPost && !isUserPost; // 路人帖 → 让帖主回复这条评论
    if (charReply) {
      toastr.info(`${cname} 正在回复你…`);
      const role = getRoleDesc();
      const plot = await buildContextSnippet();
      const cworld = getWorldSetting();
      const wb = (await getWorldbookContent()) || '';
      const eff = effStoryTime(d);
      const whenNote = (d.useStoryTime && post.st && eff && String(post.st) !== String(eff))
        ? `【时间】这帖是你在「${post.st}」发的,现在剧情已到「${eff}」;心里清楚是翻到的旧帖,可带点"翻旧帖"的感觉,但用你现在的认知回。\n` : '';
      sys = `你扮演「${cname}」本人,在小红书评论区回复${knows ? `「${userName}」(就是 {{user}} 本人)` : `一个评论了你帖子的账号「${userName}」`} 【一条】短回复(口语、【完全贴合人设】,挂"回复${userName}",只回一条、别一次回好几条)。【必须回复·这条必须有内容、不能空着、不能不接话】(用户点了"让你回复",你一定要接);就算没什么可说也按人设回一句(寒暄/调侃/敷衍也行)。
${charXhsStyleLine(d)}${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `${knows ? '当前你和 ta 的剧情' : '你现实里和 {{user}} 的过往/剧情(你私下知道的——用来对照判断这个陌生账号是不是 ta)'}: ${plot}\n` : ''}${charPhoneMemory(d, { exclComment: true, surface: 'xhs' })}${whenNote}${postCtx}
这条评论楼目前的对话:
${threadText}
${knows
        ? `你知道这个账号「${userName}」就是 {{user}} 本人(不是路人、不是粉丝),但【回复的分寸要按你和 ta 目前在剧情里的真实关系来】——你俩现在到了哪一步、是什么关系,就用那个程度的语气和称呼(别当陌生人那样疏远客气,但也【别凭空升温、别强行亲密】);到底多熟、多近、怎么称呼,完全【以人设和当前剧情里你们的关系为准】。针对 ${userName} 最新说的话,【完全代入「${cname}」本人】回应,严格按 ta 的【原人设】里的性格、语气、说话习惯,别自己加人设里没写的脾气,别 OOC。`
        : `【设定】你【不知道】这个账号「${userName}」是谁。表面把 ta 当陌生网友,【外在反应严格按你当前的怀疑档位来】(见下方档位说明)——怀疑是【多条具体线索一点点累积】出来的渐进过程:低档位时就是完全无感的纯陌生人,绝不流露认出/在意、也别凭空试探;只有当 ta 的话里真出现跟"你认识的 {{user}}"具体重合的细节、且你怀疑度已经够高时,才逐步旁敲侧击,且在 ta 亲口承认前始终不敢断定。${suspEvalRule(d)}`}${stickerHintLine(d)}想配图(比如你拍的照片/截图/现场图)就在该条加 "img"(图片文字描述,别露骨、也别每次都发);纯文字或表情就别加。${styleHint(d, true)}严格 JSON,不要解释: {"replies":[{"text":"回复内容","sticker":"表情名(可选,没有就不加)","img":"图片文字描述(想配图才给,可选)"}]${!knows ? ',"clues":[],"evidence":数字' : ''}}`;
      raw = await callXhsAPI(sys + storyTimeAsk(d), `${cname} 回复评论`);
    } else if (ownerReply) {
      // 路人帖:让帖主(post.author)本人回复这条评论
      toastr.info(`${owner} 正在回复…`);
      const noLeakRuleO = '\n【防剧情泄漏】楼主和评论者都是【互不深交的陌生网友】,不知道彼此真实身份/感情/对象/行程。只就帖子和评论里【实际写出来的内容】回应,禁止编造谁的私生活、也别突然变成认识对方。\n';
      sys = `这是小红书帖子下的评论区。帖子作者(楼主)是「${owner}」,「${clicked.author}」在评论区评论了。${postCtx}${noLeakRuleO}
【任务】让【楼主本人「${owner}」】针对「${clicked.author}」这条评论,以楼主的身份回复 1~2 条(口语短句;符合楼主作为普通陌生网友、又是这篇内容作者的口吻;挂"回复${clicked.author}")。可以是感谢/回应/解释/抬杠/玩梗,但要【贴合帖子内容和这条评论】、别答非所问。
【可发图】楼主回复时若适合配图(贴个成品/对比/截图/现场图来回应对方那种),就在该条加 "img":"图片的文字描述"(简短说清这张图是什么画面);纯文字就别加这个字段。也允许只发一张图、text 留空。
这条评论楼目前的对话:
${threadText}
${toneHint(d)}${xhsNpcStyleLine(d)}${styleHint(d, false)}严格 JSON,不要解释: {"replies":[{"text":"楼主的回复内容(只发图时可留空)","img":"图片文字描述(想配图才给,否则别加这个字段)"}]}`;
      raw = await callXhsAPI(sys, `让楼主 ${owner} 回复 ${clicked.author}`, { noContext: true, noExtra: true });
    } else {
      const others = tops.filter(t => t.id !== top.id && t.author !== userName && !isCharAcct(t.author, d)).map(t => t.author);
      const noLeakRule = '\n【防剧情泄漏】所有评论者都是【不认识楼主的陌生网友】,不知道任何人的真实身份/感情/对象/行程。只就帖子和评论里【实际写出来的内容】回应,禁止编造楼主的私生活或把人叫成"老婆/女主"之类。\n';
      sys = `这是小红书帖子下的评论区,楼主是「${userName}」。${postCtx}${noLeakRule}
【主要】让评论者「${clicked.author}」针对楼主回复 1~2 条(口语短句,符合 ta 是个普通陌生网友的口吻,挂"回复${userName}")。
【随机加料】可以再【随机挑 0~2 个】其他网友${others.length ? `(从这些人里选:${others.join('、')})` : ''}因为看到认同/想接话也回复楼主一两句(同样挂"回复${userName}");不需要就留空,别每次都加。
【可发图】个别回复想配图就在该条加 "img":"图片的文字描述"(偶尔晒图/贴对比/表情包截图那种,别每条都加);纯文字就别加。
这条评论楼里目前的对话:
${threadText}
${toneHint(d)}${xhsNpcStyleLine(d)}${styleHint(d, false)}严格 JSON,不要解释: {"replies":[{"author":"网友名(必须是「${clicked.author}」或上面列出的人)","text":"回复内容","img":"图片文字描述(想配图才给,可选)"}]}`;
      raw = await callXhsAPI(sys, `让 ${clicked.author} 回复楼主`, { noContext: true, noExtra: true });
    }
    if (!raw) return;
    const json = tryParseJSON(raw, { replies: [] });
    const fresh = loadData();
    applyAutoStoryTime(fresh, json);
    // 没认出你时:从 char 这次回复里评估怀疑度(像私信那样),并把怀疑度/线索 + 身份映射附到主线
    let suspTail = '';
    if (charReply && !knows) {
      const sr = applySuspicion(fresh, json.evidence, json.clues);
      const suspNote = `(${cname} 当前怀疑度 ${fresh.charSuspicion}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${suspMaxNote(fresh)}`;
      suspTail = ` ${suspNote} ${metaUserNote(fresh)}`;
    }
    const fpost = findPost(fresh, postId);
    if (!fpost) return;
    const ftops = ensureThreaded(fpost);
    const fth = findThread(ftops, cid) || findThread(ftops, top.id);
    if (!fth) return;
    const ftop = fth.top;
    ftop.replies = ftop.replies || [];
    const validNames = new Set([clicked.author, ...tops.map(t => t.author)]);
    let added = 0;
    const npcLines = [];
    const _stkMap = stickerUrlMap(fresh);
    const _sliceN = charReply ? 1 : (ownerReply ? 2 : (json.replies || []).length);
    (json.replies || []).slice(0, _sliceN).forEach(r => {
      const author = charReply ? cname : (ownerReply ? owner : (r.author || clicked.author));
      const text = String(r.text || '').trim();
      const _stkUrl = (charReply && r.sticker && _stkMap[r.sticker]) ? _stkMap[r.sticker] : null;
      const _img = r.img ? String(r.img).trim() : null;
      if (!text && !_stkUrl && !_img) return;
      if (!charReply && !ownerReply && !validNames.has(author)) return; // 不许凭空冒出新角色
      if (author === fresh.userName) return;
      const _rTo = ownerReply ? clicked.author : fresh.userName;
      ftop.replies.push({ id: uid(), author, text, img: _img, sticker: _stkUrl, reply_to: _rTo, isChar: charReply || isCharAcct(author, fresh), likes: Math.floor(Math.random() * 30), liked: false, time: Date.now(), st: stStamp(fresh), location: pickLoc() });
      npcLines.push(`${charReply ? '{{char}}' : author}${ownerReply ? `(楼主)回复${clicked.author}` : '回道'}「${text || (_img ? '[图片]' : '[表情]')}」`);
      added++;
    });
    // char 回复后:随机(约一半概率)冒出 1~2 条路人 NPC 围观这段互动、冲着 char 那条回复起哄(也可能不出现)
    if (charReply && added && Math.random() < 0.5) {
      const charSaid = (json.replies || []).map(r => r.text).filter(Boolean).join(' / ');
      const others2 = ftops.filter(t => t.id !== ftop.id && t.author !== fresh.userName && !isCharAcct(t.author, fresh)).map(t => t.author);
      const nsys = `小红书评论区。楼主「${fresh.userName}」在帖子下评论,帖子作者「${cname}」回复了楼主:「${charSaid}」。${postCtx}
【防剧情泄漏】路人都是【不认识楼主和 ${cname} 的真实关系/身份/剧情】的陌生网友,只看到这段公开的评论互动。让【1~2 个】路人网友${others2.length ? `(可从这些人里选:${others2.join('、')},也可用新网名)` : ''}围观到这段互动后插一句——是冲着【${cname} 那条回复】来的(吐槽/起哄/磕到了/调侃那种),挂"回复${cname}",口语短。${toneHint(fresh)}${xhsNpcStyleLine(fresh)}严格 JSON,不要解释: {"replies":[{"author":"网名","text":"回复内容"}]}`;
      const nraw = await callXhsAPI(nsys, '路人围观起哄', { noContext: true, noExtra: true });
      const nj = tryParseJSON(nraw, { replies: [] });
      (nj.replies || []).slice(0, 2).forEach(r => {
        const a = String(r.author || '').trim(), t = String(r.text || '').trim();
        if (!a || !t || a === fresh.userName || isCharAcct(a, fresh)) return;
        ftop.replies.push({ id: uid(), author: a, text: t, reply_to: cname, likes: Math.floor(Math.random() * 30), liked: false, time: Date.now(), st: stStamp(fresh), location: pickLoc() });
        npcLines.push(`${a}(对${cname}的回复)起哄道「${t}」`);
      });
    }
    if (!added) { toastr.info(charReply ? `${cname} 这次没接话` : (ownerReply ? `${owner} 这次没接话` : `${clicked.author} 这次没接话`)); return; }
    fresh.routeContext.expanded = fresh.routeContext.expanded || [];
    if (!fresh.routeContext.expanded.includes(ftop.id)) fresh.routeContext.expanded.push(ftop.id);
    // 帖主回复路人评论(楼主非你、评论者也非你)时不进"通知",那不是回复你
    if (!ownerReply || clicked.author === fresh.userName) {
      addNotif(fresh, { kind: 'postcomment', author: charReply ? cname : (ownerReply ? owner : clicked.author), isChar: charReply, text: (json.replies[0] && json.replies[0].text) || '', replyTo: fpost.title, postId: fpost.id });
    }
    await saveData(fresh);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId,
      ownerReply ? `💬 楼主 ${owner} 回复了 ${clicked.author}` : `💬 ${charReply ? cname : clicked.author} 回复了你的评论`);
    const isMyPost = (fresh.myPosts || []).some(p => p.id === postId);
    // 把暂存的"{{user}}评论 + 本次回复"打包成一条进主线(带完整帖子正文)
    const flushed = await flushPendingCommentSync(fresh, fpost, npcLines, ftop.id, suspTail);
    if (flushed) await saveData(fresh);
    else if (isMyPost || isCharPost) await syncToMain(`[小红书]${postRef(fpost)} 评论区:${charReply ? '{{char}}' : clicked.author}回复了 {{user}}——${npcLines.join('；')}${suspTail}`, fresh.syncHidden);
  }

  async function generatePostComments(postId) {
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    const tops = ensureThreaded(post);
    const isMyPost = (d.myPosts || []).some(p => p.id === postId);
    const isCharPost = post.author === charDisplayName(d);
    const isRegen = tops.length > 0;
    toastr.info(isRegen ? '重新生成评论中(优质评论会涨赞)…' : '生成评论中…');

    // 评论者是陌生路人,绝对不能知道主线剧情/楼主真实身份,所以不注入角色背景
    const noLeakRule = '\n【重要·防剧情泄漏】所有评论者都是【不认识楼主、也不认识其他评论者的陌生网友】,不知道任何人的真实身份、感情状况、对象、行程或剧情设定。【禁止】把谁叫成"女主角/女主/老婆/嫂子/男主"之类;【禁止】凭空编造楼主或某个评论者的私生活/感情/对象/经历(例如"你男朋友""你昨晚去蹦迪""你不是在跟谁谁谁吗"这种没在帖子里写过的事)。只就帖子和评论里【实际写出来的内容】回应。\n';
    // 作者下场回复:只在别人(NPC)的帖子上启用。char 的帖子【不】在这里让 char 下场(那是没人设的浅回复,易OOC),char 回复走"点你评论旁的↻让 ta 回复"那条带人设的路径
    const authorReplyRule = (!isMyPost && !isCharPost && post.author)
      ? `\n你也可以让帖子作者「${post.author}」本人下场回复 1~2 条(author 填「${post.author}」,会显示"作者"标签)。`
      : '';
    let sys, raw, json;
    const stickerNames = (d.stickers || []).map(s => s.name);
    const stickerRule = stickerNames.length
      ? `\n【表情包】可用表情:${stickerNames.join('、')}。可以让【个别】评论(不是每条)带一个表情,在该评论里加 "sticker":"表情名"(必须从列表里选)。`
      : '';
    const stickerMap = {};
    (d.stickers || []).forEach(s => { stickerMap[s.name] = s.url; });

    // 聊天截图帖:把对话内容喂给评论生成;求助帖让评论给"怎么回"的建议
    const chatCtx = post.type === 'chat' && post.chatlog
      ? `\n这是一篇"聊天记录截图"帖,内容是楼主和暧昧/恋爱对象的对话:\n${post.chatlog.map(x => `${x.role === 'user' ? '楼主' : (post.charName || 'TA')}: ${x.text || (x.sticker ? '[表情]' : x.img ? '[图片]' : '')}`).join('\n')}\n`
      : '';
    const helpBias = post.type === 'chat' && post.chatMode === 'help'
      ? '这是【求助帖】,楼主在问"这条该怎么回"。评论要以热心网友支招为主:给具体的回复话术建议、分析对方心理、或调侃,口吻像小红书姐妹团。\n'
      : '';
    // 楼主性别(只有用户自己的帖子才知道),让评论区用对称呼,别认错性别
    const isUserPost = (d.myPosts || []).some(p => p.id === post.id);
    const genderLine = (isUserPost && d.userGender && d.userGender !== '保密')
      ? `\n【楼主性别】发帖人(楼主)是【${d.userGender}生】,评论区要按这个性别称呼/默认,不要认错性别。\n`
      : '';
    const bioLine = (isUserPost && (d.userBio || '').trim())
      ? `\n【楼主主页签名】楼主(用户名「${d.userName}」)的个性签名是:「${(d.userBio || '').trim()}」。⚠这是【签名/简介,不是 ta 的名字】,别把签名内容当成名字来称呼 ta;要称呼就用用户名「${d.userName}」。可作了解 ta 性格的参考,但别据此编造没写过的私事。\n`
      : '';
    const imgLine = post.type === 'image'
      ? `\n【这是图片笔记·不是纯文字】这篇带图,配图画面是:「${(post.coverText || post.title || '').trim()}」。评论的人是在【看这张图】——要围绕画面本身反应(里面的人/物/场景/穿搭/食物/风景/构图/氛围等),像在评论一张照片(例:"这构图绝了""姐姐好好看""这是哪儿啊求定位""看饿了""氛围感拉满"),不要把这行画面描述当成楼主打出来的文字去逐字回。\n`
      : '';
    const tagLine = (post.tags && post.tags.length) ? `\n话题标签: ${post.tags.map(t => '#' + String(t).replace(/^#/, '')).join(' ')}` : '';
    const postBody = `【这篇笔记的完整内容(标题+正文+标签都要读到再评论)】\n帖子标题: ${post.title || '(无标题)'}\n正文: ${post.content || '(无正文)'}${tagLine}${imgLine}${chatCtx}${genderLine}${bioLine}\n⚠【标题也是帖子的一部分】评论必须结合【标题 + 正文】整体理解,别只盯正文、忽略标题;正文写"如题/同上/见标题"时,意思要到标题里找(例:标题「大家晚上吃的什么」+ 正文「如题 求推荐」= 楼主在问大家晚饭吃啥、求吃的推荐)。`;

    // 是不是"帅照/美照/健身照"——这种很容易招来陌生人搭讪/骚扰
    const hotText = `${post.coverText || ''} ${post.title || ''} ${post.content || ''} ${(post.tags || []).join(' ')}`;
    const isHotSelfie = isUserPost && post.type === 'image'
      && /自拍|帅|美|漂亮|身材|健身|腹肌|马甲线|大长腿|腿|颜值|性感|钓系|素颜|肌肉|穿搭|jk|泳装|比基尼|锁骨|侧颜|出片/i.test(hotText);
    const flirtHint = isHotSelfie
      ? `\n★这是一张展示长相/身材/健身/性感的照片,【很可能】招来陌生人搭讪骚扰:stranger_dm.trigger 请设为 true,opening 用搭讪/暧昧/油腻猎艳的口吻(夸长相身材、要微信/联系方式、约见面那种),可以冒犯油腻,但【不写露骨性行为细节】。评论区也可以有几条"舔屏""求微信""老婆"这种饥渴评论。\n`
      : '';
    // 擦边/暧昧氛围的帖子(不限自己的帖):个别 NPC 评论可以晒自己的"私照"
    const isFlirty = /自拍|帅|美|漂亮|身材|健身|腹肌|马甲线|腿|颜值|性感|钓系|肌肉|穿搭|jk|泳装|比基尼|锁骨|侧颜|约|暧昧|擦边|舔|prpr|老公|老婆|男友|女友/i.test(hotText);
    const privPicHint = isFlirty
      ? `\n【私照氛围】这是擦边/暧昧向的帖子,可以有【个别】NPC 在评论里晒自己的"私照"回应气氛——在该评论加 "img":"图片文字描述"(比如自己的暧昧自拍、身材照、健身照那种,可以撩、可以钓,但【描述不露骨、不写性行为】),配合调情/攀比的热闹感。\n`
      : '';

    if (!isRegen) {
      sys = `你是小红书评论区生成器,为下面这条帖子生成 4~6 条真实风格的用户评论。
${noLeakRule}${helpBias}${flirtHint}${privPicHint}要求:
1. 评论作者用小红书风格用户名,彼此不重复,不要出现用户"${d.userName}"
2. 风格多样:捧场/追问/吐槽/玩梗/共情${post.chatMode === 'help' ? '/支招给建议' : ''},口语化。emoji 看情况偶尔带,不用每条都加。
3. 可以有人回复别人(reply_to 填被回复者的用户名)${authorReplyRule}
4. 【个别】评论(不是每条,偶尔一两条)可以晒图,在该评论加 "img":"图片的详细文字描述"(比如晒同款、对比图、表情包截图、自己的照片)
5. 判断这条帖子【内容】是否会吸引陌生人主动私信(情绪化/求助/有故事感/晒人引人好奇/有争议/晒颜值身材 才会,按内容判断)。
   注意:陌生人私信里【绝对不要】出现用户的剧情/主角的故事,陌生人是路人网友,只针对帖子内容、说自己的事。
${xhsNameRule()}${memeHint(d)}${stickerRule}${toneHint(d) + xhsNpcStyleLine(d)}${styleHint(d, false)}
严格输出 JSON,不要解释:
{"comments":[{"author":"用户名","reply_to":"被回复者(可选)","text":"内容","sticker":"表情名(可选)","img":"图片描述(可选)"}],
"stranger_dm":{"trigger":true或false,"name":"陌生人网名","persona":"15字内人设","opening":"私信开场白(只针对帖子+陌生人自己,不提主角剧情)"}}`;
      raw = await callXhsAPI(sys, postBody, { noContext: true, noExtra: true });
      if (!raw) return;
      json = tryParseJSON(raw, { comments: [] });
      // 构建楼层:无 reply_to → 顶层;有 reply_to → 挂到对应作者楼层
      const list = (json.comments || []).filter(c => c.author && c.author !== d.userName);
      list.forEach(c => {
        const node = { id: uid(), author: c.author, text: c.text || '', img: c.img || null, sticker: stickerMap[c.sticker] || null, likes: Math.floor(Math.random() * 60), liked: false, time: Date.now(), location: pickLoc() };
        if (c.reply_to) {
          const top = tops.find(t => t.author === c.reply_to);
          if (top) {
            node.reply_to = c.reply_to; top.replies = top.replies || []; top.replies.push(node);
            if (c.reply_to === d.userName) addNotif(d, { kind: 'reply', author: c.author, text: c.text || '', replyTo: post.title, postId: post.id });
            else if (isMyPost) addNotif(d, { kind: 'postcomment', author: c.author, text: c.text || '', replyTo: post.title, postId: post.id });
            return;
          }
        }
        node.replies = [];
        tops.push(node);
        if (isMyPost) addNotif(d, { kind: 'postcomment', author: c.author, text: c.text || '', replyTo: post.title, postId: post.id });
      });
      if (tops[0]) tops[0].first = true; // 首评标记
      post.likes = (post.likes || 0) + Math.floor(Math.random() * 30) + 5;
    } else {
      // 重新生成:judge 优质旧评论 → 涨赞 + 跟随回复 + 新评论
      const flat = flattenComments(tops);
      const meLabel = isMyPost ? '【楼主(发帖人)】' : '【我·一条普通路人评论】';
      const numbered = flat.map((f, i) =>
        `[${i + 1}] ${f.c.author === d.userName ? meLabel : ''}${f.c.author}${f.c.reply_to ? ` 回复${f.c.reply_to}` : ''}: ${f.c.text} (当前${f.c.likes || 0}赞)`).join('\n');
      const userCmtIdx = flat.map((f, i) => f.c.author === d.userName ? (i + 1) : null).filter(x => x);
      const interactRule = userCmtIdx.length
        ? (isMyPost
          ? `\n★【增强互动】发帖人本人(${d.userName})在自己帖子下发了评论,序号 ${userCmtIdx.join('、')}。请针对这些生成 2~4 条网友回复(to_idx 指向这些序号),接梗/回应/调侃/共情。回复者都是不认识 ta 的网友,别编造 ta 的身份或私生活。`
          : isCharPost
            ? `\n标 ${userCmtIdx.join('、')} 的是「${d.userName}」在这帖下的评论。【不要】在这里替帖子作者「${post.author}」回复 ta(作者的回复由用户单独触发);其他网友也【不要】特意去回复 ta。你只管生成别的网友对【帖子本身】的新评论/盖楼。`
            : `\n标 ${userCmtIdx.join('、')} 的是一个路过的网友(${d.userName})在评论楼主的帖子(ta 不是发帖人)。【只需】让帖子作者「${post.author}」本人回复 ta 这几条(replies 里 to_idx 指向 ${userCmtIdx.join('、')}、author 填「${post.author}」,会显示"作者"标签)。其他网友【不要】特意去回复 ta——大家是冲着帖子和楼主来的,凡是对"帖子/楼主"说的话就发成独立新评论(new)或回复楼主,【不要】挂成"回复 ${d.userName}"。ta 只是个陌生路人,大家不认识 ta,别编造 ta 的身份/私生活。`)
        : '';
      sys = `你是小红书评论区生成器。下面是某帖子已有的评论(带序号,有的是楼中楼回复)。请你:
${noLeakRule}${helpBias}1. 判断哪些已有评论"有梗/真诚/戳人/会被点赞",在 boost 里给它们涨赞;越精彩 add_likes 越高(5~300),普通的别加。
2. 针对优质评论生成 1~3 条"跟随回复"(replies),to_idx 指向被回复评论的序号。${interactRule}
3. 再新增 1~3 条全新独立评论(new)${post.chatMode === 'help' ? ',其中至少 1 条给出具体"怎么回"的建议' : ''},其中【个别】可带 "img":"图片描述"(偶尔晒图)。${authorReplyRule}${flirtHint}${privPicHint}
4. 判断帖子内容是否会吸引陌生人私信(同首次规则;陌生人私信里不要出现主角剧情)。
【不要】以"${d.userName}"的名义新增评论或回复——只让别的网友说话,但可以回复/回应 ta。口语化,emoji 偶尔带就行。
${xhsNameRule()}${memeHint(d)}${stickerRule}${toneHint(d) + xhsNpcStyleLine(d)}${styleHint(d, false)}
已有评论:
${numbered}

严格输出 JSON,不要解释:
{"boost":[{"idx":序号,"add_likes":数字}],
"replies":[{"to_idx":序号,"author":"用户名","text":"回复内容"}],
"new":[{"author":"用户名","text":"评论内容","sticker":"表情名(可选)","img":"图片描述(可选)"}],
"stranger_dm":{"trigger":true或false,"name":"陌生人网名","persona":"15字内人设","opening":"私信开场白(不提主角剧情)"}}`;
      raw = await callXhsAPI(sys, postBody, { noContext: true, noExtra: true });
      if (!raw) return;
      json = tryParseJSON(raw, {});
      // 涨赞
      (json.boost || []).forEach(b => {
        const f = flat[(b.idx | 0) - 1];
        if (f) f.c.likes = (f.c.likes || 0) + Math.max(0, b.add_likes | 0);
      });
      // 楼主自己的评论也会被网友点赞,每次重新生成都涨一点
      flat.forEach(f => {
        if (f.c.author === d.userName) f.c.likes = (f.c.likes || 0) + Math.floor(Math.random() * 25) + 3;
      });
      // 跟随回复(挂到目标所在楼层)
      const repliesToUser = [];
      (json.replies || []).forEach(r => {
        if (!r.author || r.author === d.userName) return;
        const f = flat[(r.to_idx | 0) - 1];
        const top = f ? f.top : null;
        if (top) {
          top.replies = top.replies || [];
          top.replies.push({ id: uid(), author: r.author, reply_to: f.c.author, text: r.text || '', likes: Math.floor(Math.random() * 30), liked: false, time: Date.now(), location: pickLoc() });
          if (f.c.author === d.userName) {
            // 回复了 user → 任何帖子都通知;并记下来用于打包同步
            addNotif(d, { kind: 'reply', author: r.author, text: r.text || '', replyTo: f.c.text, postId: post.id });
            repliesToUser.push({ cid: top.id, line: `${r.author}回道「${r.text || ''}」` });
          } else if (isMyPost) {
            // 自己的帖子里,NPC 之间盖楼也算新评论 → 通知
            addNotif(d, { kind: 'postcomment', author: r.author, text: r.text || '', replyTo: post.title, postId: post.id });
          }
        }
      });
      // 新顶层评论
      (json.new || []).forEach(c => {
        if (!c.author || c.author === d.userName) return;
        tops.push({ id: uid(), author: c.author, text: c.text || '', img: c.img || null, sticker: stickerMap[c.sticker] || null, likes: Math.floor(Math.random() * 40), liked: false, time: Date.now(), location: pickLoc(), replies: [] });
        // 自己的帖子:任何新评论都进通知
        if (isMyPost) addNotif(d, { kind: 'postcomment', author: c.author, text: c.text || '', replyTo: post.title, postId: post.id });
      });
      // 这一轮里有人回复了 {{user}} → 把之前暂存的"{{user}}回复"打包成一条主线消息
      if (isMyPost && repliesToUser.length) {
        const byCid = {};
        repliesToUser.forEach(x => { (byCid[x.cid] = byCid[x.cid] || []).push(x.line); });
        for (const cid in byCid) await flushPendingCommentSync(d, post, byCid[cid], cid);
      }
    }

    // 自己的帖子:生成评论时顺带造一些"赞和收藏""新增关注"通知,让那两个入口也有数字
    if (isMyPost) {
      const likeN = Math.floor(Math.random() * 3) + 1; // 1~3 个赞
      const usedL = new Set();
      for (let i = 0; i < likeN; i++) {
        let nm = randomXhsName(); let guard = 0;
        while (usedL.has(nm) && guard++ < 6) nm = randomXhsName();
        usedL.add(nm);
        addNotif(d, { cat: 'like', author: nm, postId: post.id, postTitle: post.title });
      }
      post.likes = (post.likes || 0) + likeN + Math.floor(Math.random() * 20);
      if (Math.random() < 0.55) { // 偶尔涨粉
        const fn = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < fn; i++) addNotif(d, { cat: 'follow', author: randomXhsName() });
        d.fansCount = (d.fansCount || 0) + fn;
      }
    }

    // 陌生人私信:只在【自己的帖子】才会有人私信你;私密账号不触发;帅照美照几乎必触发骚扰
    const dm = json.stranger_dm;
    const gate = isHotSelfie ? 0.97 : 0.7;
    if (isMyPost && dm && dm.trigger === true && dm.name && dm.opening && Math.random() < gate) {
      d.dms = d.dms || [];
      d.dms.unshift({
        id: uid(), name: dm.name, persona: dm.persona || '', fromPostId: post.id,
        messages: [{ role: 'npc', text: dm.opening, time: Date.now(), st: stStamp(d) }],
        lastTime: Date.now(), unread: true,
      });
      toastr.info(`💌 陌生人「${dm.name}」给你发了私信`);
      await syncToMain(`[小红书] ${postRef(post, d)}吸引了陌生网友「${dm.name}」私信`, d.syncHidden);
    }

    await saveData(d);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId,
      isRegen ? '💬 评论区已更新' : `💬 评论生成好了(${countComments(tops)} 条)`);
    toastr.success(isRegen ? '✓ 评论区已更新' : `✓ ${countComments(tops)} 条评论`);
  }

  // ============ char 打通主线 ============
  // 找/建与 char 的专属私信会话
  function getCharDm(d) {
    const cname = charDisplayName(d);
    let dm = (d.dms || []).find(x => x.isChar && x.app !== 'wx');
    if (!dm) {
      dm = { id: uid(), name: cname, isChar: true, app: 'xhs', persona: '(剧情角色)', messages: [], lastTime: Date.now(), unread: false };
      d.dms = d.dms || [];
      d.dms.unshift(dm);
    } else {
      dm.name = cname; // 名字跟随设置
    }
    return dm;
  }
  // 微信里的 char 会话(和小红书私信分开)
  function getWxCharDm(d) {
    const cname = getCharName();
    let dm = (d.dms || []).find(x => x.isChar && x.app === 'wx');
    if (!dm) {
      dm = { id: uid(), name: cname, isChar: true, app: 'wx', persona: '(剧情角色)', messages: [], lastTime: Date.now(), unread: false };
      d.dms = d.dms || [];
      d.dms.unshift(dm);
    } else { dm.name = cname; }
    return dm;
  }

  // ===== 多人卡(单卡多角色)花名册 =====
  function isMultiCast(d) { return (((d || loadData()).cast) || []).length > 0; }
  function castOf(d, dm) {
    if (!dm || !dm.castId) return null;
    return (d.cast || []).find(c => c.id === dm.castId) || null;
  }
  // 找/建某个出场角色的微信对话
  function castWxDm(d, cm) {
    d.dms = d.dms || [];
    let dm = d.dms.find(x => x.app === 'wx' && x.castId === cm.id && !x.castAlt);
    if (!dm) {
      dm = { id: uid(), name: cm.name, castId: cm.id, app: 'wx', avatar: cm.avatar || '', persona: '(多人卡角色)', messages: [], lastTime: Date.now(), unread: false };
      d.dms.unshift(dm);
    } else {
      dm.name = cm.name;
      if (cm.avatar) dm.avatar = cm.avatar;
    }
    return dm;
  }
  // 找/建某个出场角色的小红书私信
  function castXhsDm(d, cm) {
    d.dms = d.dms || [];
    let dm = d.dms.find(x => x.app === 'xhs' && x.castId === cm.id && !x.castAlt);
    if (!dm) {
      dm = { id: uid(), name: cm.name, castId: cm.id, app: 'xhs', avatar: cm.avatar || '', persona: '(多人卡角色)', messages: [], lastTime: Date.now(), unread: false };
      d.dms.unshift(dm);
    } else {
      dm.name = cm.name;
      if (cm.avatar) dm.avatar = cm.avatar;
    }
    return dm;
  }
  // 把一段设定文本里的角色抠出来 → [{name,persona}]
  async function detectCastFromText(label, text) {
    const sys = `下面是一段"单卡多角色"的角色设定文本(出处:${label})。请挑出其中的【可对话角色】,每个给:name(角色名)+ persona(人设)+ main(是否主要角色)。
- 【persona 要忠于原文、别概括】:把原文里关于该角色写到的设定【尽量完整保留】——性格、身份/背景、说话风格、与主角的关系、关键经历/特征等,照原文措辞与细节整理,不要压缩成一句、不要改写或脑补。
- 【main 字段】:ta 是不是【主要 / 核心角色】?——主角团、主线常出场、可攻略/恋爱对象、戏份重的 → main=true;【配角 / 背景 NPC】(教练、经纪人、解说、粉丝、路人、家人、同事、只被提到一两句没展开的人)→ main=false。拿不准就 false。
- 【只挑真正的人物角色】:别把世界观名词、地名、组织、势力、物品、功法、术语当角色。
- 同一人若有本名/昵称/称号,合并成一个,用最常用的名字。
只输出严格 JSON,不要解释、不要 markdown: {"cast":[{"name":"角色名","persona":"忠于原文的完整人设","main":true或false}]}
设定文本:
${String(text || '').slice(0, 12000)}`;
    const raw = await callXhsAPI(sys, '识别出场角色', { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { cast: [] });
    return (Array.isArray(j.cast) ? j.cast : [])
      .map(x => ({ name: String(x.name || '').trim().slice(0, 24), persona: String(x.persona || '').trim().slice(0, 2000), main: x.main === true }))
      .filter(x => x.name);
  }
  // 从角色卡 + 世界书(禁用条目也读)识别出场角色;条目多时逐条识别,避免一次输出被截断漏人
  async function detectCast() {
    const card = getRoleDesc();
    const { books, entries } = await getWorldbookEntriesRaw();
    const wbChars = entries.reduce((s, e) => s + (e.content || '').length, 0);
    // 诊断:让你直接看到到底读到了什么
    toastr.info(`读到:角色卡 ${card ? card.length : 0} 字 · 世界书 ${books.length} 本 / ${entries.length} 条(${wbChars} 字)。识别中…`);
    if ((!card || card.trim().length < 10) && entries.length === 0) {
      toastr.warning('角色卡和世界书都没读到内容。多半是这本世界书没绑定到当前角色/对话(去 ST 把它设为角色或聊天的世界书),或条目是空的。');
      return;
    }
    // 拆块:角色卡正文 + 每个世界书条目;再按每批约 12000 字打包,逐批识别(覆盖全部内容,不截断)
    const pieces = [];
    if (card && card.trim().length >= 10) pieces.push(`【角色卡正文】\n${card}`);
    entries.forEach((e, i) => {
      const t = (e.content || '').trim();
      if (t.length >= 10) pieces.push(`【世界书条目「${e.name || ('#' + (i + 1))}」】\n${e.content}`);
    });
    if (!pieces.length) { toastr.warning('读到的世界书条目都是空的,可手动添加角色'); return; }
    const BATCH = 7000, MAX_BATCHES = 22;
    const batches = [];
    let cur = '';
    for (const p of pieces) {
      const seg = p.length > BATCH ? p.slice(0, BATCH) : p;
      if (cur && (cur.length + seg.length + 2) > BATCH) { batches.push(cur); cur = ''; }
      cur = cur ? (cur + '\n\n' + seg) : seg;
    }
    if (cur) batches.push(cur);
    const useBatches = batches.slice(0, MAX_BATCHES);
    const truncated = batches.length > MAX_BATCHES;
    toastr.info(`内容较多,分 ${useBatches.length} 批识别中(每批约 7 千字,稍等)…`);
    let found = [];
    for (let i = 0; i < useBatches.length; i++) {
      const r = await detectCastFromText(`第 ${i + 1}/${useBatches.length} 批设定`, useBatches[i]);
      found = found.concat(r);
    }
    // 按名字合并去重;同名保留人设更全的那条,主次取"任一为主则主"
    const byName = new Map();
    found.forEach(f => {
      if (!f.name) return;
      const ex = byName.get(f.name);
      if (!ex) { byName.set(f.name, f); return; }
      if (f.persona && f.persona.length > (ex.persona || '').length) ex.persona = f.persona;
      ex.main = ex.main || f.main;
    });
    const cap = [...byName.values()].slice(0, 60);
    if (!cap.length) { toastr.warning('没识别出角色,可手动添加'); return; }
    const d = loadData();
    // 不直接入册:列成候选,让你勾选要哪几个(主要角色默认勾选,配角/NPC 默认不勾)
    d.castCandidates = cap.map(f => ({ name: f.name, persona: f.persona, sel: !!f.main }));
    await saveData(d);
    refreshXhs();
    const mains = cap.filter(f => f.main).length;
    toastr.success(`识别到 ${cap.length} 个候选(其中 ${mains} 个判为主要角色,已默认勾选)。在下面【勾选要加入的】——配角/NPC 不勾就行;读了 ${useBatches.length} 批/${entries.length} 条世界书${truncated ? ',内容超长仅读前 22 批' : ''}`);
  }
  async function toggleCand(idx) {
    const d = loadData();
    if (!d.castCandidates || !d.castCandidates[idx]) return;
    d.castCandidates[idx].sel = !d.castCandidates[idx].sel;
    await saveData(d);
    refreshXhs();
  }
  async function candSetAll(on) {
    const d = loadData();
    (d.castCandidates || []).forEach(c => { c.sel = on; });
    await saveData(d);
    refreshXhs();
  }
  async function candAdd() {
    const d = loadData();
    const cands = (d.castCandidates || []).filter(c => c.sel);
    if (!cands.length) { toastr.info('没勾选任何角色'); return; }
    d.cast = d.cast || [];
    let added = 0, updated = 0;
    cands.forEach(f => {
      const ex = d.cast.find(c => c.name === f.name);
      if (ex) { if (!ex.personaEdited && f.persona && f.persona !== ex.persona) { ex.persona = f.persona; updated++; } return; }
      d.cast.push({ id: uid(), name: f.name, persona: f.persona, avatar: '' });
      added++;
    });
    d.castCandidates = [];
    await saveData(d);
    refreshXhs();
    toastr.success(`已加入 ${added} 个 · 更新 ${updated} 个(花名册共 ${d.cast.length} 个)`);
  }
  async function candDiscard() {
    const d = loadData();
    d.castCandidates = [];
    await saveData(d);
    refreshXhs();
  }
  async function clearCast() {
    const TOP = getTop();
    const d = loadData();
    if (!(d.cast || []).length) return;
    if (!TOP.confirm(`清空花名册全部 ${d.cast.length} 个角色?\n这会一并删掉他们的微信/小红书私信对话(他们发的帖子保留)。不可恢复。`)) return;
    d.cast = [];
    d.dms = (d.dms || []).filter(x => !x.castId);
    await saveData(d);
    refreshXhs();
    toastr.success('花名册已清空');
  }
  async function addCastMember() {
    const TOP = getTop();
    const name = (TOP.prompt('角色名:', '') || '').trim();
    if (!name) return;
    const persona = (TOP.prompt(`「${name}」的人设/性格(可留空,之后再编辑):`, '') || '').trim();
    const d = loadData();
    d.cast = d.cast || [];
    if (d.cast.some(c => c.name === name)) { toastr.info('已有同名角色'); return; }
    d.cast.push({ id: uid(), name: name.slice(0, 24), persona: persona.slice(0, 2000), avatar: '' });
    await saveData(d);
    refreshXhs();
    toastr.success(`已加角色「${name}」`);
  }
  async function editCastPersona(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const v = TOP.prompt(`「${c.name}」的人设/性格:`, c.persona || '');
    if (v == null) return;
    c.persona = String(v).trim().slice(0, 2000);
    c.personaEdited = true;
    await saveData(d);
    refreshXhs();
    toastr.success('已更新人设');
  }
  async function renameCastMember(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const v = (TOP.prompt('新角色名:', c.name) || '').trim();
    if (!v) return;
    const oldName = c.name;
    c.name = v.slice(0, 24);
    (d.dms || []).filter(x => x.castId === cid && !x.castAlt).forEach(x => { x.name = c.name; });
    // 把 ta 名下旧帖子 + 评论/楼中楼里显示的名字也迁到新名,免得旧内容还挂旧名
    [...(d.feed || []), ...(d.myPosts || []), ...(d.ficFeed || [])].forEach(p => {
      if (!p) return;
      if (p.castId === cid || p.author === oldName) p.author = c.name;
      (p.comments || []).forEach(tp => {
        if (tp.castId === cid || tp.author === oldName) tp.author = c.name;
        if (tp.reply_to === oldName) tp.reply_to = c.name;
        (tp.replies || []).forEach(r => {
          if (r.castId === cid || r.author === oldName) r.author = c.name;
          if (r.reply_to === oldName) r.reply_to = c.name;
        });
      });
    });
    await saveData(d);
    refreshXhs();
    toastr.success('已改名');
  }
  async function setCastAvatar(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const v = TOP.prompt('头像图片 URL(留空=用首字母):', c.avatar || '');
    if (v == null) return;
    c.avatar = String(v).trim().slice(0, 500);
    (d.dms || []).filter(x => x.castId === cid && !x.castAlt).forEach(x => { x.avatar = c.avatar; });
    await saveData(d);
    refreshXhs();
    toastr.success('已设头像');
  }
  async function setCastBg(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const v = TOP.prompt('小红书主页背景:图片 URL 或颜色(如 #ffd1dc;留空=默认):', c.profileBg || '');
    if (v == null) return;
    c.profileBg = String(v).trim().slice(0, 500);
    await saveData(d);
    refreshXhs();
    toastr.success('已设主页背景');
  }
  async function toggleCastLurk(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    if (c.lurk) {
      c.lurk = false;
      await saveData(d);
      refreshXhs();
      toastr.success(`${c.name} 已退出粉丝群潜伏`);
      return;
    }
    if (!c.lurkAlias) c.lurkAlias = genLurkAlias();
    c.lurk = true;
    await saveData(d);
    refreshXhs();
    toastr.success(`${c.name} 开始用一个随机马甲潜伏——点那颗按钮旁的"🔒"可查看马甲名(每轮群刷新随机最多 2 个潜伏角色冒泡)`);
  }
  async function revealCastLurkName(cid) {
    const d = loadData();
    if (!d.routeContext) d.routeContext = {};
    d.routeContext.castLurkShown = (d.routeContext.castLurkShown === cid) ? null : cid;
    await saveData(d);
    refreshXhs();
  }
  async function toggleLurkThoughts() {
    const d = loadData();
    d.lurkThoughts = !d.lurkThoughts;
    await saveData(d);
    refreshXhs();
    toastr.success(d.lurkThoughts ? '已开启:潜伏角色会冒出"只有你看得到"的心声' : '已关闭偷听心声');
  }
  async function toggleCastKnows(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    if (c.knows === 'unknown') {
      if (!TOP.confirm(`把「${c.name}」改回"认识你"?\n会关掉这段悬念(怀疑度 ${c.susp || 0} 不再起作用),ta 之后按剧情真实关系跟你互动。`)) return;
      c.knows = 'knows';
      await saveData(d);
      refreshXhs();
      toastr.success(`${c.name} 现在【认识】你了(按剧情真实关系互动)`);
    } else {
      if (!TOP.confirm(`让「${c.name}」变成"线上不认识你"?\nta 会把你的账号/私信当陌生人,靠线索慢慢起疑(类似单 char 的小号悬念)。怀疑度从 0 开始;ta 的潜伏也会一并关掉。`)) return;
      c.knows = 'unknown';
      c.susp = 0;
      c.clues = [];
      if (c.lurk) c.lurk = false;
      await saveData(d);
      refreshXhs();
      toastr.success(`${c.name} 现在【不认识】你了——当陌生人,靠线索慢慢起疑(怀疑度 0/100)`);
    }
  }
  async function revealCastKnows(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c || c.knows !== 'unknown') return;
    if (!TOP.confirm(`让「${c.name}」当场认出"这个账号/对象就是 {{user}}"?会写进主线。`)) return;
    const sp = c.susp || 0;
    c.knows = 'knows';
    c.susp = 0;
    await saveData(d);
    refreshXhs();
    await forceSyncToMain(`[小红书] 出场角色「${c.name}」 认出了:一直在线上接触的那个账号「${d.userName}」其实就是 {{user}} 本人(此前 ta 一直把 ta 当陌生人,怀疑度 ${sp}/100)。身份就此挑明。`);
    toastr.success(`${c.name} 认出你了(已写进主线)`);
  }
  // 展开/收起某个角色的「身份/悬念」面板(存进 data,刷新后保持)
  async function toggleCastPanel(cid) {
    const d = loadData();
    d.castPanelOpen = (d.castPanelOpen === cid) ? null : cid;
    await saveData(d);
    refreshXhs();
  }
  async function castResetSusp(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    if (!TOP.confirm(`把「${c.name}」的怀疑度清零、并清空已攒的线索?`)) return;
    c.susp = 0;
    c.clues = [];
    await saveData(d);
    refreshXhs();
    toastr.success(`已清零「${c.name}」的怀疑度`);
  }
  async function setCastSuspSens(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const cur = c.suspSens || '正常';
    const v = (TOP.prompt(`「${c.name}」起疑速度(影响怀疑度涨多快):\n填 慢 / 正常 / 快`, cur) || '').trim();
    if (!v) return;
    c.suspSens = (v === '慢' || v === '快') ? v : '正常';
    await saveData(d);
    refreshXhs();
    toastr.success(`「${c.name}」起疑速度:${c.suspSens}`);
  }
  // 小号马甲(B):从主线导入该角色偷偷建的小号 + ta 用这个号发的私信(user 不知道是 ta)
  async function importCastAlt(cid) {
    const d0 = loadData();
    const c0 = (d0.cast || []).find(x => x.id === cid);
    if (!c0) return toastr.info('找不到这个角色');
    const cname = c0.name;
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到主线上下文'); return; }
    toastr.info(`正在从主线找「${cname}」的小号…`);
    const sys = `下面是一段角色扮演主线剧情。请判断:其中【出场角色「${cname}」】是不是【偷偷新建/使用了一个小号马甲】给「{{user}}」发小红书私信(ta 心里知道对面是 {{user}},但瞒着不让 {{user}} 知道这小号是自己)。
- 如果有:给出这个小号的名字(alias),以及「${cname}」用这个小号发给 {{user}} 的私信内容(messages 数组,按先后;只要「${cname}」用小号说出的话,别把 {{user}} 的话或旁白写进去;也别把卡里其他角色的算进来)。
- 如果剧情里没有这回事:alias 返回空字符串。
只输出严格 JSON,不要解释、不要 markdown: {"alias":"小号名(没有就空)","messages":["私信1","私信2"]}
主线剧情:
${ctx}`;
    const raw = await callXhsAPI(sys, `提取 ${cname} 的小号`, { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { alias: '', messages: [] });
    const alias = String(j.alias || '').trim().slice(0, 24);
    const msgs = (Array.isArray(j.messages) ? j.messages : []).map(t => String(t || '').trim()).filter(Boolean).slice(0, 12);
    if (!alias) { toastr.warning(`主线里没读到「${cname}」用小号发私信,确认剧情里 ta 真的建了小号、用它发了消息再试`); return; }
    const d = loadData();
    d.dms = d.dms || [];
    let dm = d.dms.find(x => x.castAlt && x.castId === cid);
    if (!dm) {
      dm = { id: uid(), name: alias, persona: `(其实是出场角色 ${cname} 的马甲)`, app: 'xhs', castId: cid, castAlt: true, castAltRevealed: false, avatar: '', messages: [], lastTime: Date.now(), unread: false };
      d.dms.unshift(dm);
    } else {
      dm.name = alias;
    }
    const tk0 = Date.now();
    msgs.forEach((t, i) => { dm.messages.push({ role: 'npc', text: t, time: tk0 + i * 1000, st: stStamp(d) }); });
    dm.lastTime = Date.now();
    dm.unread = true;
    d.currentApp = 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 已导入小号「${alias}」${msgs.length ? `(${msgs.length} 条私信)` : ''}——${cname} 的马甲,你这边看到的是陌生人`);
  }
  // 揭穿:让 user 当场发现这个小号其实是某出场角色,写进主线
  async function revealCastAlt(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    const dm = (d.dms || []).find(x => x.castAlt && x.castId === cid);
    if (!c || !dm) return toastr.info('这个角色还没有小号(先从主线导入)');
    if (dm.castAltRevealed) return toastr.info('已经揭穿过了');
    if (!TOP.confirm(`揭穿:让 {{user}} 当场发现小号「${dm.name}」其实是「${c.name}」?会写进主线。`)) return;
    dm.castAltRevealed = true;
    await saveData(d);
    refreshXhs();
    await forceSyncToMain(`[小红书·私信] {{user}} 发现了:一直私信 ta 的小号「${dm.name}」,其实是出场角色「${c.name}」本人的马甲——「${c.name}」用这个号瞒着 {{user}} 接近 ta 的事,被 {{user}} 揭穿了。`);
    toastr.success(`已揭穿:「${dm.name}」=${c.name}(已写进主线)`);
  }
  // 让/取消让这个出场角色的小号也潜进 user 的粉丝群(同一个马甲名)
  async function toggleCastAltLurk(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !dm.castAlt) return;
    dm.castAltLurk = !dm.castAltLurk;
    if (d.routeContext) d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    const c = castOf(d, dm);
    toastr.success(dm.castAltLurk
      ? `已让小号「${dm.name}」也潜进你的粉丝群——下次群里点"生成回复"时,它会按${c ? '「' + c.name + '」' : ' ta '}的性格决定冒不冒泡(同一个马甲)`
      : `已取消小号「${dm.name}」潜群`);
  }
  async function unsetCastAlt(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !dm.castAlt) return;
    dm.castAlt = false;
    dm.castAltRevealed = false;
    dm.castAltLurk = false;
    delete dm.castId;
    if (d.routeContext) d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success(`已取消小号标记,「${dm.name}」变回普通陌生人`);
  }
  // 双盲小号:小号主人(char/出场角色)知不知道"对面这个陌生账号其实是 user"
  function altDoesntKnow(dm) { return !!(dm && dm.altWatch && dm.altWatch.knows === 'unknown'); }
  function altOwnerName(d, dm) { return dm.castAlt ? ((castOf(d, dm) || {}).name || 'ta') : charDisplayName(d); }
  async function toggleAltWatch(dmId) {
    const TOP = getTop();
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !(dm.charAlt || dm.castAlt)) return;
    const ownerName = altOwnerName(d, dm);
    if (d.routeContext) d.routeContext.dmMenuOpen = false;
    if (altDoesntKnow(dm)) {
      if (!TOP.confirm(`把小号「${dm.name}」的主人改回"知道对面是你"?\nta 会恢复成"心里清楚对面就是你、只是瞒着自己身份"(怀疑度 ${dm.altWatch.susp || 0} 作废)。`)) return;
      dm.altWatch = null;
      await saveData(d); refreshXhs();
      toastr.success(`「${dm.name}」的主人现在【知道】对面是你(只瞒自己身份)`);
    } else {
      if (!TOP.confirm(`让小号「${dm.name}」的主人(${ownerName})也【不知道】对面是你?\n变成"双盲":你不知道这小号是 ${ownerName},ta 也不知道你是 ${d.userName}——ta 把你当陌生人,从内容里慢慢起疑(怀疑度从 0 开始)。`)) return;
      dm.altWatch = { name: ownerName, knows: 'unknown', susp: 0, clues: [], suspSens: '正常' };
      await saveData(d); refreshXhs();
      toastr.success(`双盲已开:${ownerName} 用小号「${dm.name}」跟你聊,但 ta 不知道对面是你`);
    }
  }
  async function revealAltWatch(dmId) {
    const TOP = getTop();
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !altDoesntKnow(dm)) return;
    const ownerName = dm.altWatch.name || altOwnerName(d, dm);
    if (!TOP.confirm(`让「${ownerName}」(小号「${dm.name}」的主人)当场认出"对面这个陌生人其实是 ${d.userName}"?会写进主线。`)) return;
    const sp = dm.altWatch.susp || 0;
    dm.altWatch.knows = 'knows';
    if (d.routeContext) d.routeContext.dmMenuOpen = false;
    await saveData(d); refreshXhs();
    await forceSyncToMain(`[小红书·私信] ${dm.castAlt ? `出场角色「${ownerName}」` : '{{char}}'} 用小号「${dm.name}」跟一个"陌生人"聊着,突然认出:对面其实就是 {{user}} 本人(此前一直当陌生人,怀疑度 ${sp}/100)。身份就此挑明(但 {{user}} 这边仍不一定知道这小号是 ${ownerName})。`);
    toastr.success(`${ownerName} 认出对面是你了(已写进主线)`);
  }
  // 新建小号:给 char(单人卡)或某出场角色(多人卡)凭空建一个假名小号——主线没提过也能建
  async function createAlt() {
    const TOP = getTop();
    const d = loadData();
    const multi = isMultiCast(d);
    let cm = null, ownerName = '';
    if (multi) {
      const cast = d.cast || [];
      if (!cast.length) return toastr.info('花名册里还没有角色,先去 设置 → 🎭出场角色 添加');
      const list = cast.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      const v = (TOP.prompt(`给哪个出场角色新建小号?填编号:\n${list}`, '1') || '').trim();
      cm = cast[parseInt(v) - 1];
      if (!cm) { toastr.info('没选中角色'); return; }
      ownerName = cm.name;
    } else {
      ownerName = charDisplayName(d);
      if (!ownerName) return toastr.info('当前没有可用角色');
    }
    const alias = (TOP.prompt(`小号叫什么名字?\n(你这边只会看到这个假名;${ownerName} 心里清楚对面是你,但瞒着你)`, '') || '').trim();
    if (!alias) return;
    d.dms = d.dms || [];
    const dm = { id: uid(), name: alias, persona: `(其实是${multi ? '出场角色' : ''} ${ownerName} 的马甲)`, app: 'xhs', avatar: '', messages: [], lastTime: Date.now(), unread: false };
    if (multi) { dm.castId = cm.id; dm.castAlt = true; dm.castAltRevealed = false; }
    else { dm.charAlt = true; dm.charAltRevealed = false; }
    const lurk = TOP.confirm(`要不要也让小号「${alias}」潜进你的粉丝群?\n(同一个马甲:既私聊你、又在群里围观。点"取消"=只私聊)`);
    if (lurk) { if (multi) dm.castAltLurk = true; else dm.charAltLurk = true; }
    const blindNo = TOP.confirm(`小号主人「${ownerName}」知道对面是你吗?\n点"确定"=知道(ta 心里清楚是你、只瞒自己身份,常规款);\n点"取消"=不知道(双盲:ta 也把你当陌生人,慢慢起疑)。`);
    if (!blindNo) dm.altWatch = { name: ownerName, knows: 'unknown', susp: 0, clues: [], suspSens: '正常' };
    const wantOpener = TOP.confirm(`要不要让「${ownerName}」用这个小号【主动先发一条搭讪私信】?\n(会参考你小红书最近发的帖子,像 ta 刷到你来搭话。点"取消"=你自己先开口)`);
    d.dms.unshift(dm);
    d.currentApp = 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    if (wantOpener) { await genAltOpener(dm.id); }
    else toastr.success(`✓ 已建小号「${alias}」(${ownerName} 的马甲)${lurk ? ',并已设为潜入粉丝群' : ''}——直接在这条私信里跟 ta 聊`);
  }
  // 小号开场白(单人/多人共用):让伪装的角色主动发第一条私信,参考 user 最近的小红书帖子来搭讪
  async function genAltOpener(dmId) {
    const d0 = loadData();
    const dm0 = (d0.dms || []).find(x => x.id === dmId);
    if (!dm0 || !(dm0.charAlt || dm0.castAlt)) return;
    const isCast = !!dm0.castAlt;
    const cm = isCast ? castOf(d0, dm0) : null;
    if (isCast && !cm) return;
    const ownerName = isCast ? cm.name : charDisplayName(d0);
    const role = isCast ? (cm.persona || '') : getRoleDesc();
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const myPosts = (d0.myPosts || []).slice(0, 6).map((p, i) => `${i + 1}.「${(p.title || '').trim()}」${p.type === 'image' ? '(配图:' + (p.coverText || '').slice(0, 30) + ')' : ''} ${(p.content || '').replace(/\n/g, ' ').slice(0, 80)}`).join('\n');
    const postsBlock = myPosts ? `【${d0.userName} 最近发的小红书帖子(你就是刷到这些才找上 ta 的,借题搭讪)】:\n${myPosts}\n` : `(${d0.userName} 还没发什么帖子,就按普通搭讪来,别硬提帖子)\n`;
    toastr.info(`${ownerName} 正在用小号给你发消息…`);
    const sys = `你扮演「${ownerName}」本人${isCast ? '(这张多人卡里的出场角色之一)' : ''}。ta 用一个谁都认不出的小号马甲「${dm0.name}」第一次给「${d0.userName}」发私信——${d0.userName} 以为是个陌生人,其实就是 ${ownerName},但 ${d0.userName} 完全不知道。
${charXhsStyleLine(d0)}【${ownerName} 的人设/性格/说话习惯——严格贴合,绝不 OOC${isCast ? ',也别串到卡里其他角色' : ''}】:\n${role}
${cworld ? `世界观/背景(仅供你把握分寸,别照搬进消息): ${cworld}\n` : ''}${plot ? `【${ownerName} 私下知道的事 / 和 ${d0.userName} 的过往——⚠仅供你把握内心动机和分寸,【绝对不许写进这条消息、不许暗示、不许借此提帖子里没有的事】】:\n${plot}\n` : ''}${postsBlock}
要求:
- 写【第一条】搭讪私信,拆成 1~3 条很短的消息放进 texts。
- 【最重要·铁律】这是【一个陌生人】刷到 ta 主页后发来的第一条私信。你能聊的【只有上面 ta 公开帖子里【确实写到】的内容】(某条帖子的话题、配图、心情),就事论事地搭话。
- 【绝对禁止】提到帖子里【没有】的任何东西:不许提你私下知道的事/剧情往事/ta 的真实身份、近况、私人信息;不许说"你好像谁""我们是不是见过""你让我想起…"这种话;不许任何只有"认识 ta 本人"才说得出口的内容——这些会【当场暴露你不是陌生人】,是严重违规。没人希望小号穿帮。
- 帖子很少、或没写什么具体的,就发一句轻巧普通的搭讪(夸下配图、随口问一句),【绝对别编造、别脑补帖子里没有的细节】。
- 语气可以是 ${ownerName} 的口吻,但表面【必须就是个普通陌生网友】,半点不能露出你是 ${ownerName}、也不能露出你认识 ta。
- 别替对方说话——这是你主动开的头,${d0.userName} 还没回过。
${d0.lurkThoughts ? `另外写一句 ta 此刻【没说出口的真实内心独白】(心声)放进 heart,1~2 句——这里【可以】流露 ta 其实知道对面就是 ${d0.userName}、心里的真实盘算(只有上帝视角看得到,不会穿帮);但上面的 texts 仍要滴水不漏地装陌生人。` : ''}${stickerHintLine(d0)}${styleHint(d0, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${d0.lurkThoughts ? ',"heart":"心声"' : ''}}`;
    const raw = await callXhsAPI(sys, `${ownerName} 用小号开场`, { noContext: true });
    if (!raw) return;
    const j = tryParseJSON(raw, { texts: [] });
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    let tk = Date.now(); const said = [];
    (Array.isArray(j.texts) ? j.texts : []).forEach(t => { const txt = String(t || '').trim(); if (txt) { dm.messages.push({ role: 'npc', text: txt, time: tk++, st: stStamp(d) }); said.push(txt); } });
    if (!said.length) { toastr.info('这次没生成开场白,你先开口也行'); return; }
    if (d.lurkThoughts && j.heart) dm.messages.push({ role: 'heart', name: dm.name, who: ownerName, text: String(j.heart).slice(0, 120), time: tk++, st: stStamp(d) });
    dm.lastTime = tk; dm.unread = true;
    await saveData(d);
    refreshXhs();
    const fcm = isCast ? castOf(d, dm) : null;
    const meta = isCast ? castAltMetaNote(fcm || cm, dm, d)
      : `(⚠系统设定·仅供旁白叙事,【严禁泄漏给 {{user}}】:小号「${dm.name}」其实是 {{char}}(${ownerName})本人,ta 瞒着 {{user}} 用这个号接近 ta;{{user}} 揭穿前别让 ta 发现、{{char}} 也不点破。)`;
    await forceSyncToMain(`[小红书·私信] ${isCast ? `出场角色「${ownerName}」` : '{{char}}'} 用小号「${dm.name}」主动给 {{user}} 发了第一条搭讪私信:「${said.join(' ')}」(借着 {{user}} 的小红书帖子搭话,维持伪装)。${meta}`);
    toastr.success(`💌 ${ownerName} 用小号「${dm.name}」给你发来了消息`);
  }
  async function delCastMember(cid) {
    const TOP = getTop();
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    if (!TOP.confirm(`删除角色「${c.name}」?ta 的微信对话也会一起删掉。`)) return;
    d.cast = (d.cast || []).filter(x => x.id !== cid);
    d.dms = (d.dms || []).filter(x => x.castId !== cid);
    await saveData(d);
    refreshXhs();
    toastr.success('已删除');
  }
  async function openCastWxChat(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const dm = castWxDm(d, c);
    d.currentApp = 'wx';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
  }
  async function openCastXhsChat(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const dm = castXhsDm(d, c);
    dm.unread = false;
    d.currentApp = 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
  }

  // ===== 多人卡·角色的小红书账号(主页/发帖/历史动态/签名),和单 char 同套 =====
  async function openCastProfile(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    d.currentApp = 'xhs';
    d.currentRoute = 'cast-profile';
    d.routeContext = { castId: cid };
    await saveData(d);
    refreshXhs();
    const hasPosts = [...(d.feed || []), ...(d.myPosts || [])].some(p => p.castId === cid || p.author === c.name);
    if (!c.postsSeeded || !hasPosts) await seedCastPosts(cid);
    const d2 = loadData();
    const c2 = (d2.cast || []).find(x => x.id === cid);
    if (c2 && !c2.bio) await genCastBio(cid, true);
  }

  async function genCastBio(cid, silent) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const cname = c.name;
    if (!silent) toastr.info('正在生成签名…');
    const role = c.persona || '';
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const plot = await buildContextSnippet();
    const sys = `给小红书角色「${cname}」写一句【个性签名】(主页名字下面那行小字)。「${cname}」是这张多人卡里的出场角色之一。
要求:15字以内,符合 ta 的性格/身份/气质,有网感,像真人会写的签名,不要加引号、不要解释,别串到别的角色。
- 结合下面最近剧情判断 ta 此刻心境,让签名含蓄透出那点情绪,但别直白点名、别剧透。
${role ? `角色人设: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${plot ? `最近剧情(判断 ta 此刻心情): ${plot}\n` : ''}
只输出签名这一句本身。`;
    const raw = await callXhsAPI(sys, `给 ${cname} 写签名`, { noContext: true, noExtra: true });
    if (!raw) return;
    const bio = String(raw).replace(/^["'「『]|["'」』]$/g, '').split('\n')[0].trim().slice(0, 40);
    if (!bio) { if (!silent) toastr.warning('没生成出来,再试一次'); return; }
    const fresh = loadData();
    const fc = (fresh.cast || []).find(x => x.id === cid);
    if (fc) { fc.bio = bio; await saveData(fresh); refreshXhs(); }
    if (!silent) toastr.success(`✓ 签名:${bio}`);
  }

  async function genCastPost(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const cname = c.name;
    toastr.info(`${cname} 正在发动态…`);
    const role = c.persona || '';
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const plot = await buildContextSnippet();
    const sys = `你扮演「${cname}」本人(这张多人卡里的出场角色之一),在小红书发一条动态(帖子)。完全代入 ta、严格按 ta 的人设/性格/说话习惯写,【不要 OOC】,也别串到卡里别的角色。
${role ? `【${cname} 的人设/性格】:\n${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${plot ? `当前剧情: ${plot}\n` : ''}
【别脑补】只基于上面真实发生/明说过的剧情来发,绝不捏造剧情里没出现过的细节;可写心情/感受/氛围,但别把没发生的事写成真事。
给: type("text"或"image")、title(<25字)、coverText(image帖=画面描述/text帖=大字句)、content(60~140字,ta的口吻)、tags(可空)${styleHint(d, true)}
严格 JSON: {"type":"text或image","title":"...","coverText":"...","content":"...","tags":["可选"]}`;
    const raw = await callXhsAPI(sys, `以 ${cname} 身份发帖`);
    if (!raw) return;
    const p = tryParseJSON(raw, {});
    const fresh = loadData();
    const type = p.type === 'text' ? 'text' : 'image';
    const post = {
      id: uid(), author: cname, castId: cid, isCast: true, type, bg: type === 'text' ? pickTextBg() : null,
      title: p.title || '', coverText: p.coverText || '', content: p.content || '',
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
      time: Date.now(), st: stStamp(fresh), likes: Math.floor(Math.random() * 3000) + 200, comments: [],
    };
    fresh.feed = [post, ...(fresh.feed || [])].slice(0, 80);
    await saveData(fresh);
    await forceSyncToMain(`[小红书] 「${cname}」(本卡出场角色)发了条动态${postRef(post, fresh, true)}`);
    refreshXhs();
    toastr.success(`✓ ${cname} 发了动态,正在生成评论…`);
    await generatePostComments(post.id);
  }

  async function seedCastPosts(cid) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return;
    const cname = c.name;
    toastr.info(`正在进入 ${cname} 的主页…`);
    const role = c.persona || '';
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const eff = effStoryTime(d);
    const useST = !!(d.useStoryTime && eff);
    const sys = `你扮演「${cname}」本人(这张多人卡里的出场角色之一),补几条 ta 过去发在小红书上的动态(3~5 条,从几周前到最近),并给每条配一些评论。完全符合 ta 的人设,别串到别的角色。
${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `近况参考(可作最近一两条素材,别剧透主角剧情): ${plot}\n` : ''}${useST ? `当前剧情时间是「${eff}」。给每条加 storyTime 字段=发布时的剧情时间,【都早于「${eff}」】,从较早到较近分布,越靠后越接近现在。\n` : ''}
每条给: type("text"或"image")、title(<25字)、coverText、content(50~120字,ta的口吻)、tags(可空)${useST ? '、storyTime' : ''}、comments(2~4 条)。
评论规则: comments 里 author 是陌生网友(不是 ${cname}),就【帖子内容】说话,不认识 ta 真实身份/剧情;随机给一部分评论配 ta 的回复(加 "charReply" 字段,不回就别加)。
题材生活化、贴 ta 的身份/爱好,几条之间别一个调。${toneHint(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"posts":[{"type":"...","title":"...","coverText":"...","content":"...","tags":[]${useST ? ',"storyTime":"早于现在的剧情时间"' : ''},"comments":[{"author":"陌生网友名","text":"评论","charReply":"(可选)${cname}对这条的回复,不回就别加"}]}]}`;
    const raw = await callXhsAPI(sys, `${cname} 的历史动态`);
    const j = tryParseJSON(raw, { posts: [] });
    const fresh = loadData();
    const fc = (fresh.cast || []).find(x => x.id === cid);
    const now = Date.now();
    const arr = (j.posts || []).slice(0, 6);
    arr.forEach((p, i) => {
      const type = p.type === 'text' ? 'text' : 'image';
      const st = useST ? (String(p.storyTime || '').trim() || eff) : '';
      const ptime = now - (arr.length - i) * 86400000 * (2 + Math.floor(Math.random() * 5));
      const cmts = Array.isArray(p.comments) ? p.comments.slice(0, 5) : [];
      const tops = [];
      cmts.forEach((cc, ci) => {
        const author = String(cc.author || '').trim();
        const text = String(cc.text || '').trim();
        if (!author || !text || author === cname || author === fresh.userName) return;
        const topC = { id: uid(), author, text, likes: Math.floor(Math.random() * 200) + 2, liked: false, time: ptime + (ci + 1) * 60000, st, location: pickLoc(), first: ci === 0, replies: [] };
        const cr = String(cc.charReply || '').trim();
        if (cr) topC.replies.push({ id: uid(), author: cname, isCast: true, castId: cid, reply_to: author, text: cr, likes: Math.floor(Math.random() * 150) + 5, liked: false, time: ptime + (ci + 1) * 60000 + 30000, st, location: pickLoc() });
        tops.push(topC);
      });
      fresh.feed = [{
        id: uid(), author: cname, castId: cid, isCast: true, type, bg: type === 'text' ? pickTextBg() : null,
        title: p.title || '', coverText: p.coverText || '', content: p.content || '',
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
        time: ptime, st, likes: Math.floor(Math.random() * 4000) + 200, comments: tops,
      }, ...(fresh.feed || [])].slice(0, 80);
    });
    if (arr.length && fc) fc.postsSeeded = true;
    await saveData(fresh);
    refreshXhs();
    if (arr.length) toastr.success(`✓ ${cname} 的主页`);
    else toastr.warning(`没拉到 ${cname} 的动态,可能 API 超时;进来会自动重试,或点右上角 🔄 让 ta 发一条。`);
  }

  function renderCastProfile(d) {
    const cid = d.routeContext && d.routeContext.castId;
    const c = (d.cast || []).find(x => x.id === cid);
    if (!c) return notFoundScreen('角色不见了', 'messages', 'messages');
    const cn = c.name;
    const color = randomColor(cn || 'x');
    const followed = isFollowing(d, cn);
    const seen = new Set();
    const posts = [...(d.feed || []), ...(d.myPosts || [])]
      .filter(p => p.castId === cid || p.author === cn)
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .sort((a, b) => (b.time || 0) - (a.time || 0));
    const cards = posts.map(p => `
      <div class="xhs-card" data-action="xhs-view" data-id="${p.id}">
        ${cardCover(p, false)}
        <div class="xhs-card-body">
          <div class="xhs-card-title">${esc(p.title)}</div>
          <div class="xhs-card-foot"><span class="xhs-card-author-name">${esc(cn)}</span><span class="xhs-card-like ${p.likedByMe ? 'xhs-card-liked' : ''}">❤ ${formatLikes(p.likes || 0)}</span></div>
        </div>
      </div>`).join('');
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    return `
      <div class="xhs-prof-head" style="${profileBgStyle(c.profileBg || 'linear-gradient(135deg,#caa0ff,#ff9ec4)')}">
        <div class="xhs-prof-topbar">
          <button class="xhs-icon-btn" data-action="nav" data-route="messages"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div style="display:flex;gap:4px">
            <button class="xhs-icon-btn" data-action="set-cast-bg" data-id="${cid}" title="设置主页背景"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-5 4 4 7-7"/><path d="M3 21h18"/></svg></button>
            <button class="xhs-icon-btn" data-action="gen-cast-post" data-id="${cid}" title="让 ta 发条新动态"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 0113.3-5.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 13a8 8 0 01-13.3 5.3L4 16"/><path d="M4 21v-5h5"/></svg></button>
          </div>
        </div>
        <div class="xhs-prof-id">
          <div class="xhs-prof-avatar" data-action="set-cast-avatar" data-id="${cid}" style="cursor:pointer" title="点击换头像">${avatarHtml(c.avatar, color, (cn || '?')[0])}</div>
          <div class="xhs-prof-name">${esc(cn)} <button data-action="rename-cast" data-id="${cid}" title="改昵称" style="background:rgba(255,255,255,.25);border:none;border-radius:6px;color:#fff;font-size:11px;padding:2px 6px;cursor:pointer;vertical-align:middle">✏️</button></div>
        </div>
        <div class="xhs-prof-bio">${c.bio ? esc(c.bio) : '<span style="opacity:.55">— 还没签名 —</span>'} <button class="xhs-prof-bio-btn" data-action="gen-castbio" data-id="${cid}" title="按当前剧情/心情换一句签名">🔄 换签名</button></div>
        <div class="xhs-prof-stats">
          <div><b>${posts.length}</b> 笔记</div>
          <div><b>${formatLikes(totalLikes)}</b> 获赞</div>
        </div>
        <div class="xhs-prof-btns">
          <button class="xhs-prof-action xhs-prof-follow" data-action="open-cast-xhs" data-id="${cid}">💬 私信</button>
          <button class="xhs-prof-action ${followed ? '' : 'xhs-prof-follow'}" data-action="${followed ? 'unfollow-user' : 'follow-user'}" data-name="${esc(cn)}" data-bio="${esc(c.bio || '')}">${followed ? '已关注' : '+ 关注'}</button>
        </div>
      </div>
      <div class="xhs-prof-tabs">
        <span class="xhs-prof-tab xhs-prof-tab-active">笔记 ${posts.length || ''}</span>
        <span class="xhs-prof-tab">获赞 ${formatLikes(totalLikes)}</span>
      </div>
      <div class="xhs-scroll" style="background:#f7f7f7">
        <div class="xhs-grid">${cards || '<div class="xhs-empty">正在进入 ' + esc(cn) + ' 的主页…</div>'}</div>
        <div style="height:60px"></div>
      </div>
      ${bottomNav('messages')}
    `;
  }

  // 让 char 刷到你这篇帖子并反应(评论 + 可能私信),强制进主线
  async function reactAsChar(postId) {
    const d = loadData();
    const cname = charDisplayName(d);
    if (!d.charSeesPosts) return toastr.info('没开启「char 能刷到我的帖子」,去设置打开');
    const post = findPost(d, postId);
    if (!post || !(d.myPosts || []).some(p => p.id === postId)) return toastr.info('这个功能用在你自己发的帖子上');
    const knows = d.charKnowsAlt === 'knows';
    toastr.info(`${cname} 正在看你的帖子…`);
    const role = getRoleDesc();
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const chatExtra = post.type === 'chat' && post.chatlog ? `\n(这帖里贴的聊天记录:${post.chatlog.map(x => `${x.role === 'user' ? '楼主' : (post.charName || 'TA')}:${x.text || (x.sticker ? '[表情]' : x.img ? '[图片]' : '')}`).join(' / ').slice(0, 300)})` : '';
    const sys = `你现在扮演「${cname}」本人,在小红书上刷到了一篇帖子。${knows
      ? `这帖是你的恋人/对象「${d.userName}」发的,你知道是 ta。`
      : `这是一个陌生账号「${post.author}」发的。`}
${charXhsStyleLine(d)}${role ? `你的角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景设定: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `${knows ? '当前你和 ta 的剧情进展' : '你现实里和 {{user}} 的过往/剧情(你私下知道的,仅用来对照判断这个陌生账号有没有可能是 ta——别因此就提前认定)'}: ${plot}\n` : ''}${charPhoneMemory(d, { exclComment: true, surface: 'xhs' })}${!knows ? `【关键】你完全不知道这账号是谁,更【不知道】ta 是你现实里认识的人或你的对象——把 ta 当成素不相识的陌生网友。绝对【不要】表现得你们认识:不许说"微信早给你了""姐姐""你又来了""你不是…吗"这种暗示有交集的话。【外在反应严格按你当前的怀疑档位】(见下):怀疑度低时就是毫无察觉的纯陌生人,只有具体线索累积、怀疑度升高了才会一点点起疑。\n` : ''}
帖子内容: 标题「${post.title}」 正文「${post.content}」${chatExtra}
请完全以「${cname}」的性格、语气反应:
1. comment: 在这帖下的一条评论(符合人设。${knows ? '你知道这条是 {{user}} 本人发的(你认识 ta),【按你俩目前在剧情里的真实关系来回应,以人设和剧情为准,别当陌生人也别强行升温/强行亲密】,【完全代入「' + cname + '」本人】,严格按 ta 的原人设里的性格、语气说话(也可假装路人暗示),别自己加人设里没写的脾气' : '把 ta 当陌生人,外在反应【按你当前怀疑档位】(见下):低档=毫无察觉的纯陌生人,绝不流露"眼熟/认出";若 ta 撩你/要联系方式,【按 ta 的性格】当陌生人回即可。只有怀疑度已升高才会隐隐起疑、但仍不点破,绝不表现得早就认识'})
2. dm: 要不要私信 ta?只在符合下面【任一动机】且 ta 这种性格真的会做时才 trigger=true,否则 false(不用每次都私信):
   - ${knows ? '想找对象单独说两句(【按 ta 的性格来】,别套霸总腔)' : ((d.charSuspicion || 0) >= 30 ? '你对这账号【已经起了疑】(当前怀疑度够高了),想私下旁敲侧击探一探是不是认识的人' : '【此项暂不适用:你对 ta 毫无怀疑,别为了"探身份"而私信——只有怀疑度升上来后才会这么做】')}
   - 想搭讪/对 ta 有兴趣,想加个联系方式
   - 对帖子内容(才艺/观点/同好)很感兴趣,想私下交流
   - 商务/合作/资源对接(比如演出、约稿、推广、互推那种)
   reason 填触发动机(suspect/flirt/interest/business 之一);text 是符合人设的私信内容。
   {"trigger":true或false,"reason":"suspect或flirt或interest或business","text":"私信内容"}
${knows ? '' : suspEvalRule(d)}${stickerHintLine(d)}想配图(比如你拍的照片/截图)就加 "comment_img"(图片文字描述,别露骨、别滥用);纯文字或表情就别加。${styleHint(d, true)}严格 JSON,不要解释: {"comment":"...","comment_sticker":"表情名(可选,没有就不加)","comment_img":"图片文字描述(想配图才给,可选)","dm":{"trigger":true或false,"reason":"...","text":"..."}${knows ? '' : ',"clues":[],"evidence":数字'}}`;
    const raw = await callXhsAPI(sys + storyTimeAsk(d), `以 ${cname} 的身份反应`);
    if (!raw) return;
    const j = tryParseJSON(raw, {});
    const fresh = loadData();
    applyAutoStoryTime(fresh, j);
    const fpost = findPost(fresh, postId);
    if (!fpost) return;
    const tops = ensureThreaded(fpost);
    let summary = '';
    const _sm = stickerUrlMap(fresh);
    const _cSticker = (j.comment_sticker && _sm[j.comment_sticker]) ? _sm[j.comment_sticker] : null;
    const _cImg = j.comment_img ? String(j.comment_img).trim() : null;
    if (j.comment || _cSticker || _cImg) {
      tops.push({ id: uid(), author: cname, text: j.comment || '', img: _cImg, sticker: _cSticker, isChar: true, likes: Math.floor(Math.random() * 50) + 5, liked: false, time: Date.now(), st: stStamp(fresh), location: pickLoc(), replies: [] });
      summary += `评论:"${j.comment || (_cImg ? '[图片]' : '[表情]')}"`;
      addNotif(fresh, { kind: 'postcomment', author: cname, isChar: true, text: j.comment || (_cImg ? '[图片]' : '[表情]'), replyTo: fpost.title, postId: fpost.id });
    }
    if (j.dm && j.dm.trigger === true && j.dm.text) {
      const dm = getCharDm(fresh);
      dm.messages.push({ role: 'npc', text: j.dm.text, time: Date.now(), st: stStamp(fresh) });
      dm.lastTime = Date.now(); dm.unread = true;
      summary += `${summary ? ';' : ''}私信你:"${j.dm.text}"`;
      toastr.info(`💌 ${cname} 给你发了一条私信`);
    }
    const sr = applySuspicion(fresh, j.evidence, j.clues);
    const maxNote = suspMaxNote(fresh);
    const suspNote = (!knows)
      ? `(${cname} 当前怀疑度 ${fresh.charSuspicion}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${maxNote}`
      : '';
    await saveData(fresh);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId,
      `💬 ${cname} 刷到并回应了你的笔记`);
    // 强制进主线
    await forceSyncToMain(`[小红书] {{char}}(小红书账号「${cname}」) 刷到了${knows ? `{{user}}发的` : `小红书账号「${fresh.userName}」发的`}${postRef(fpost, fresh, true)}。${summary || '看了看'}。${suspNote} ${metaUserNote(fresh)}`);
    toastr.success(`✓ ${cname} 有反应了${!knows ? ' · 怀疑度' + fresh.charSuspicion : ''}`);
  }

  // char 一键回复某帖评论区:楼主(你)的评论必回 + 随机挑几条 NPC 评论回;只回还没被 char 回过的,带人设、批量一次生成
  async function charReplyComments(postId) {
    let d = loadData();
    const cname = charDisplayName(d);
    const userName = d.userName;
    const post = (d.myPosts || []).find(p => p.id === postId) || (d.feed || []).find(p => p.id === postId) || (d.ficFeed || []).find(p => p.id === postId);
    if (!post) return toastr.info('找不到这篇笔记');
    const tops = post.comments || [];
    // 表情存的是 URL,反查成名字让 char 读得懂
    const urlName = {}; (d.stickers || []).forEach(s => { if (s && s.url) urlName[s.url] = s.name; });
    const cdesc = c => c.text || (c.img ? `[图片:${c.img}]` : (c.sticker ? `[表情${urlName[c.sticker] ? ':' + urlName[c.sticker] : ''}]` : ''));
    // char 是否已在某楼层回过 author 这条(顶层评论按 reply_to===author 或无 reply_to 视为回顶层)
    const charRepliedTo = (top, author) => (top.replies || []).some(x => (x.isChar || isCharAcct(x.author, d)) && (x.reply_to === author || (!x.reply_to && author === top.author)));
    // 收集可回复的评论:顶层 + 楼层内嵌套回复(含 ↻ 之后冒出的围观 NPC),跳过 char 自己的、以及 char 已回过的那一条
    const items = [];
    tops.forEach(top => {
      if (top.author && top.author !== cname && !isCharAcct(top.author, d) && !charRepliedTo(top, top.author)) {
        items.push({ c: top, topId: top.id, isUser: top.author === userName });
      }
      (top.replies || []).forEach(r => {
        if (!r.author || r.author === cname || isCharAcct(r.author, d) || r.isChar) return;
        if (charRepliedTo(top, r.author)) return;
        items.push({ c: r, topId: top.id, isUser: r.author === userName });
      });
    });
    const userCmts = items.filter(x => x.isUser).slice(0, 4);
    const npcCmts = items.filter(x => !x.isUser).sort(() => Math.random() - 0.5).slice(0, 3);
    const targets = [...userCmts, ...npcCmts];
    if (!targets.length) return toastr.info('评论区没有需要回复的新评论了');
    toastr.info(`${cname} 正在回复评论区…`);
    const knows = d.charKnowsAlt === 'knows';
    const role = getRoleDesc();
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const isCharP = post.author === cname;
    const postCtx = post.type === 'image'
      ? `这是${isCharP ? '你发的' : '楼主发的'}图片笔记,配图画面「${(post.coverText || post.title || '').trim()}」,正文「${post.content}」`
      : `${isCharP ? '你发的' : '楼主的'}帖子:标题「${post.title}」 正文「${post.content}」`;
    const list = targets.map((x, i) => `${i + 1}. ${x.isUser ? `【楼主${knows ? '(就是 {{user}} 本人)' : '(一个评论你的账号)'}·必回】` : ''}${x.c.author}: ${cdesc(x.c)}`).join('\n');
    const sys = `你扮演「${cname}」本人,在小红书${isCharP ? '【你自己发的这条笔记】' : '一条笔记'}的评论区里挨条回复读者评论。
${charXhsStyleLine(d)}${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `${knows ? '当前你和 ta 的剧情' : '你私下知道的剧情(用来判断"楼主"那个账号是不是 ta)'}: ${plot}\n` : ''}${charPhoneMemory(d, { exclComment: true, surface: 'xhs' })}
${postCtx}
要回复的评论(按编号):
${list}
要求:
- 标【必回】的(楼主)【必须】回,贴合你和 ta 当前剧情里的关系与称呼,别凭空升温也别端着。
- 其余路人评论挑你想搭理的回(口语短句、完全贴合人设、可调侃/玩梗/敷衍);实在没什么可说的那条可以不回(就别给那个编号)。
- 每条只回一句,会自动挂"回复对方"。【只写你要说的话本身,别在开头写"回复XX："或"@XX",系统会自动显示你回复的是谁,写了就重复了】
- 有的评论带了图片(写成 [图片:画面描述])或表情(写成 [表情:名]),回复时可以【针对那张图的内容/那个表情】来接话,显得你真的看到了。
${stickerHintLine(d)}${storyTimeAsk(d)}
严格 JSON,不要解释: {"replies":[{"n":编号,"text":"回复内容","sticker":"表情名(可选,不发就省略)"}]}`;
    const raw = await callXhsAPI(sys, `${cname} 回复评论区`, { noContext: true });
    if (!raw) return;
    const j = tryParseJSON(raw, { replies: [] });
    d = loadData();
    const fpost = (d.myPosts || []).find(p => p.id === postId) || (d.feed || []).find(p => p.id === postId) || (d.ficFeed || []).find(p => p.id === postId);
    if (!fpost) return;
    const ftops = fpost.comments || [];
    const stkMap = stickerUrlMap(d);
    applyAutoStoryTime(d, j);
    let n = 0;
    const replyLog = [];
    (j.replies || []).forEach(r => {
      const x = targets[parseInt(r.n) - 1];
      if (!x || !r.text) return;
      const ft = ftops.find(t => t.id === x.topId);
      if (!ft) return;
      const author = x.c.author;
      const rtext = stripReplyPrefix(r.text, author);
      ft.replies = ft.replies || [];
      // 精确防重:只跳过 char 已回过【这条】的(同楼层 reply_to===该作者),不再整层跳过
      if (ft.replies.some(y => (y.isChar || isCharAcct(y.author, d)) && y.reply_to === author)) return;
      const stk = (r.sticker && stkMap[r.sticker]) ? stkMap[r.sticker] : null;
      if (!rtext && !stk) return;
      ft.replies.push({ id: uid(), author: cname, text: rtext, sticker: stk, reply_to: author, isChar: true, likes: Math.floor(Math.random() * 40), liked: false, time: Date.now(), st: stStamp(d), location: pickLoc() });
      if (author === userName) addNotif(d, { kind: 'postcomment', author: cname, isChar: true, text: rtext, replyTo: fpost.title, postId: fpost.id });
      const whoLbl = author === userName ? (knows ? `楼主({{user}})` : `楼主(一个评论的账号)`) : `网友「${author}」`;
      replyLog.push(`回${whoLbl}那条「${cdesc(x.c)}」→「${rtext}${stk ? '[表情]' : ''}」`);
      n++;
    });
    if (!n) { toastr.info(`${cname} 这次没接话`); return; }
    await saveData(d);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId);
    toastr.success(`${cname} 回复了 ${n} 条评论`);
    const detail = replyLog.join(';');
    try { await syncToMain(`[小红书]${postRef(fpost, d)} 评论区:{{char}} 回复了 ${n} 条评论——${detail}`, d.syncHidden); } catch (e) {}
  }

  // 多人卡:让指定出场角色在某帖下评论。自己的帖→认识/不认识那套(可能私信);char/其他出场角色的帖→当同伴正常评论(无私信、无怀疑度)
  async function reactAsCast(postId, castId) {
    const d = loadData();
    const c = (d.cast || []).find(x => x.id === castId);
    if (!c) return toastr.info('找不到这个角色');
    const post = findPost(d, postId);
    if (!post) return toastr.info('找不到这篇帖子');
    const isOwn = (d.myPosts || []).some(p => p.id === postId);
    const authorIsPeer = post.author === charDisplayName(d) || post.isCast || !!post.castId;
    if (!isOwn && !authorIsPeer) return toastr.info('这个功能用在你自己 / char / 出场角色的帖子上');
    if (!isOwn && post.author === c.name) return toastr.info(`${c.name} 不用评论自己的帖子`);
    const cKnows = castKnows(c);
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const chatExtra = post.type === 'chat' && post.chatlog ? `\n(这帖里贴的聊天记录:${post.chatlog.map(x => `${x.role === 'user' ? '楼主' : (post.charName || 'TA')}:${x.text || (x.sticker ? '[表情]' : x.img ? '[图片]' : '')}`).join(' / ').slice(0, 300)})` : '';
    let sys;
    if (isOwn) {
      toastr.info(`${c.name} 正在看你的帖子…`);
      sys = `你现在扮演「${c.name}」本人,在小红书上刷到了一篇帖子。${cKnows ? `这帖是你认识的人「${d.userName}」发的,你知道是 ta。` : `这是一个陌生账号「${post.author}」发的。`}
${charXhsStyleLine(d)}你的人设(只演这一个角色,别串到别人): ${c.persona}
${cworld ? `世界观/背景设定: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `${cKnows ? '当前你和 ta 的剧情进展' : '你私下知道的剧情(仅用来对照判断这陌生账号会不会是你认识的人,别因此就认定)'}: ${plot}\n` : ''}${castPhoneMemory(d, c, { exclComment: true })}${!cKnows ? `【关键】你完全不知道这账号是谁,更不知道 ta 是你现实里认识的人——当素不相识的陌生网友对待,绝对别表现得认识 ta;外在反应严格按你当前怀疑档位(见下)。\n` : ''}帖子内容: 标题「${post.title}」 正文「${post.content}」${chatExtra}
请完全以「${c.name}」的性格、语气反应,${cKnows ? '【以 ta 的人设和你俩在剧情里的真实关系为准,别凭空升温也别端着】' : '【把 ta 当陌生人,反应按下面的怀疑档位】'}:
1. comment: 在这帖下的一条评论(符合人设${cKnows ? '、贴合你和 ta 当前关系' : ',就帖子内容说话,当陌生人'})。
2. dm: 要不要私信 ta?${cKnows ? '只在 ta 这种性格、你俩这种关系下真的会私信时 trigger=true' : `只在你已对这账号起疑(怀疑度够高)、想私下探一探,或单纯对帖子内容感兴趣想搭话时 trigger=true`},否则 false。text 是符合人设的私信内容。
${!cKnows ? castSuspEvalRule(c) : ''}${stickerHintLine(d)}想配图(你拍的照片/截图)就加 "comment_img"(图片文字描述,别露骨、别滥用);纯文字或表情就别加。${styleHint(d, true)}严格 JSON,不要解释: {"comment":"...","comment_sticker":"表情名(可选,没有就不加)","comment_img":"图片文字描述(可选)","dm":{"trigger":true或false,"text":"私信内容"}${!cKnows ? ',"clues":[],"evidence":数字' : ''}}`;
    } else {
      toastr.info(`${c.name} 正在看「${post.author}」的帖子…`);
      sys = `你现在扮演「${c.name}」本人,在小红书上刷到了【${post.author}】发的一篇帖子(${post.author} 是你认识的人/同伴,【不是】 {{user}})。
${charXhsStyleLine(d)}你的人设(只演这一个角色,别串到别人): ${c.persona}
${cworld ? `世界观/背景设定: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `当前剧情/你们之间的关系: ${plot}\n` : ''}帖子内容: 标题「${post.title}」 正文「${post.content}」${chatExtra}
以「${c.name}」的性格、语气,在这帖下留一条评论——【贴合你和「${post.author}」在剧情里的真实关系】(该调侃调侃、该捧场捧场、该拌嘴拌嘴、该关心关心,完全符合人设;别强行升温也别端着,别串到别的角色)。
${stickerHintLine(d)}想配图就加 "comment_img"(图片文字描述,别露骨);纯文字或表情就别加。${styleHint(d, true)}严格 JSON,不要解释: {"comment":"...","comment_sticker":"表情名(可选)","comment_img":"图片文字描述(可选)"}`;
    }
    const raw = await callXhsAPI(sys + storyTimeAsk(d), `以 ${c.name} 的身份反应`);
    if (!raw) return;
    const j = tryParseJSON(raw, {});
    const fresh = loadData();
    applyAutoStoryTime(fresh, j);
    const fc = (fresh.cast || []).find(x => x.id === castId) || c;
    const fpost = findPost(fresh, postId);
    if (!fpost) return;
    const tops = ensureThreaded(fpost);
    let summary = '';
    const _sm = stickerUrlMap(fresh);
    const _cSticker = (j.comment_sticker && _sm[j.comment_sticker]) ? _sm[j.comment_sticker] : null;
    const _cImg = j.comment_img ? String(j.comment_img).trim() : null;
    if (j.comment || _cSticker || _cImg) {
      tops.push({ id: uid(), author: fc.name, text: j.comment || '', img: _cImg, sticker: _cSticker, isCast: true, castId, avatar: fc.avatar || '', likes: Math.floor(Math.random() * 50) + 5, liked: false, time: Date.now(), st: stStamp(fresh), location: pickLoc(), replies: [] });
      summary += `评论:"${j.comment || (_cImg ? '[图片]' : '[表情]')}"`;
      if (isOwn) addNotif(fresh, { kind: 'postcomment', author: fc.name, text: j.comment || (_cImg ? '[图片]' : '[表情]'), replyTo: fpost.title, postId: fpost.id });
    }
    if (isOwn && j.dm && j.dm.trigger === true && j.dm.text) {
      const dm = castXhsDm(fresh, fc);
      dm.messages.push({ role: 'npc', text: j.dm.text, time: Date.now(), st: stStamp(fresh) });
      dm.lastTime = Date.now(); dm.unread = true;
      summary += `${summary ? ';' : ''}私信你:"${j.dm.text}"`;
      toastr.info(`💌 ${fc.name} 给你发了一条私信`);
    }
    if (!summary) { toastr.info(`${fc.name} 看了看,没表态`); return; }
    const fKnows = castKnows(fc);
    let suspNote = '';
    if (isOwn && !fKnows) {
      const sr = castApplySusp(fc, j.evidence, j.clues);
      suspNote = `(「${fc.name}」当前怀疑度 ${fc.susp || 0}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${castSuspMaxNote(fc)}`;
    }
    await saveData(fresh);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId,
      `💬 ${fc.name} 评论了`);
    if (isOwn) {
      await forceSyncToMain(`[小红书] ${fKnows ? `出场角色「${fc.name}」 刷到了 {{user}} 发的` : `陌生账号「${fc.name}」(其实是出场角色「${fc.name}」,但 ta 不知道这是 {{user}})刷到了 小红书账号「${fresh.userName}」发的`}${postRef(fpost, fresh, true)}。${summary}。${suspNote} ${castMetaUserNote(fc, fresh)}`);
    } else {
      await forceSyncToMain(`[小红书] 出场角色「${fc.name}」 在「${fpost.author}」发的${postRef(fpost, fresh, true)}下评论:${summary}。`);
    }
    toastr.success(`✓ ${fc.name} 评论了${isOwn && !fKnows ? ' · 怀疑度' + (fc.susp || 0) : ''}`);
  }

  // 多人卡:让指定出场角色一键回复某帖评论区(楼主必回 + 挑几条路人),只回该角色还没回过的
  async function castReplyComments(postId, castId) {
    let d = loadData();
    const c0 = (d.cast || []).find(x => x.id === castId);
    if (!c0) return toastr.info('找不到这个角色');
    const cname = c0.name;
    const userName = d.userName;
    const post = (d.myPosts || []).find(p => p.id === postId) || (d.feed || []).find(p => p.id === postId) || (d.ficFeed || []).find(p => p.id === postId);
    if (!post) return toastr.info('找不到这篇笔记');
    const tops = post.comments || [];
    const urlName = {}; (d.stickers || []).forEach(s => { if (s && s.url) urlName[s.url] = s.name; });
    const cdesc = c => c.text || (c.img ? `[图片:${c.img}]` : (c.sticker ? `[表情${urlName[c.sticker] ? ':' + urlName[c.sticker] : ''}]` : ''));
    // 这个角色是否已在某楼层回过 author 这条
    const castRepliedTo = (top, author) => (top.replies || []).some(x => x.castId === castId && (x.reply_to === author || (!x.reply_to && author === top.author)));
    const items = [];
    tops.forEach(top => {
      if (top.author && top.author !== cname && top.castId !== castId && !castRepliedTo(top, top.author)) {
        items.push({ c: top, topId: top.id, isUser: top.author === userName });
      }
      (top.replies || []).forEach(r => {
        if (!r.author || r.author === cname || r.castId === castId) return;
        if (castRepliedTo(top, r.author)) return;
        items.push({ c: r, topId: top.id, isUser: r.author === userName });
      });
    });
    const userCmts = items.filter(x => x.isUser).slice(0, 4);
    const npcCmts = items.filter(x => !x.isUser).sort(() => Math.random() - 0.5).slice(0, 3);
    const targets = [...userCmts, ...npcCmts];
    if (!targets.length) return toastr.info('评论区没有需要回复的新评论了');
    toastr.info(`${cname} 正在回复评论区…`);
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const isMyPost = (d.myPosts || []).some(p => p.id === postId);
    const isOwnByCast = post.author === c0.name;
    const postOwnerLbl = isMyPost ? '楼主(你认识的人)' : (isOwnByCast ? '你自己' : `「${post.author}」`);
    const postCtx = post.type === 'image'
      ? `这是${postOwnerLbl}发的图片笔记,配图画面「${(post.coverText || post.title || '').trim()}」,正文「${post.content}」`
      : `${postOwnerLbl}发的帖子:标题「${post.title}」 正文「${post.content}」`;
    const c0Knows = castKnows(c0);
    const mateNames = new Set([...(d.cast || []).map(x => x.name).filter(n => n && n !== cname), charDisplayName(d)]);
    const list = targets.map((x, i) => {
      const a = x.c.author;
      const tag = x.isUser
        ? (c0Knows ? `【${d.userName}(就是你认识的 {{user}})·必回】` : `【${d.userName}(一个评论的陌生账号·你不知道是谁)·必回】`)
        : (mateNames.has(a) ? `【同伴「${a}」·本卡角色,你认识 ta】` : '');
      return `${i + 1}. ${tag}${a}: ${cdesc(x.c)}`;
    }).join('\n');
    const sys = `你扮演「${cname}」本人,在小红书一条笔记的评论区里挨条回复评论。
${charXhsStyleLine(d)}你的人设(只演这一个角色,别串到别人): ${c0.persona}
${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${c0Knows && plot ? `当前你和 ta 的剧情: ${plot}\n` : ''}${castPhoneMemory(d, c0, { exclComment: true })}${postCtx}
要回复的评论(按编号):
${list}
要求:
- 标【必回】的(楼主)【必须】回,${c0Knows ? '贴合你和 ta 当前剧情里的关系与称呼,别凭空升温也别端着。' : '【但你不认识这个账号】,当陌生网友回——绝不流露认出/在意、不用私下称呼、不提 ta 近况,就普通陌生人那样搭话。'}
- 评论里凡标了【同伴】的,是你认识的【本卡角色】(队友/对手/朋友/家人/暧昧对象等)——【按你和 ta 在剧情里的真实关系回】,绝不当陌生网友:不许说"你谁啊""走错片场""我不就是…吗""不认识"这类话,平时怎么称呼 ta、什么语气就怎么来。
- 其余路人评论挑你想搭理的回(口语短句、完全贴合人设、可调侃/玩梗/敷衍);实在没什么可说的那条可以不回(就别给那个编号)。
- 每条只回一句,会自动挂"回复对方"。【只写你要说的话本身,别在开头写"回复XX："或"@XX",系统会自动显示你回复的是谁,写了就重复了】
- 有的评论带了图片(写成 [图片:画面描述])或表情(写成 [表情:名]),回复时可以针对那张图/那个表情接话,显得你真的看到了。
${stickerHintLine(d)}${storyTimeAsk(d)}
严格 JSON,不要解释: {"replies":[{"n":编号,"text":"回复内容","sticker":"表情名(可选,不发就省略)"}]}`;
    const raw = await callXhsAPI(sys, `${cname} 回复评论区`, { noContext: true });
    if (!raw) return;
    const j = tryParseJSON(raw, { replies: [] });
    d = loadData();
    const fc = (d.cast || []).find(x => x.id === castId) || c0;
    const fpost = (d.myPosts || []).find(p => p.id === postId) || (d.feed || []).find(p => p.id === postId) || (d.ficFeed || []).find(p => p.id === postId);
    if (!fpost) return;
    const ftops = fpost.comments || [];
    const stkMap = stickerUrlMap(d);
    applyAutoStoryTime(d, j);
    let n = 0;
    const replyLog = [];
    (j.replies || []).forEach(r => {
      const x = targets[parseInt(r.n) - 1];
      if (!x || !r.text) return;
      const ft = ftops.find(t => t.id === x.topId);
      if (!ft) return;
      const author = x.c.author;
      const rtext = stripReplyPrefix(r.text, author);
      if (!rtext && !(r.sticker && stkMap[r.sticker])) return;
      ft.replies = ft.replies || [];
      if (ft.replies.some(y => y.castId === castId && y.reply_to === author)) return;
      const stk = (r.sticker && stkMap[r.sticker]) ? stkMap[r.sticker] : null;
      ft.replies.push({ id: uid(), author: fc.name, text: rtext, sticker: stk, reply_to: author, isCast: true, castId, avatar: fc.avatar || '', likes: Math.floor(Math.random() * 40), liked: false, time: Date.now(), st: stStamp(d), location: pickLoc() });
      if (author === userName) addNotif(d, { kind: 'postcomment', author: fc.name, text: rtext, replyTo: fpost.title, postId: fpost.id });
      const whoLbl = author === userName ? `楼主「${author}」` : `网友「${author}」`;
      replyLog.push(`回${whoLbl}那条「${cdesc(x.c)}」→「${rtext}${stk ? '[表情]' : ''}」`);
      n++;
    });
    if (!n) { toastr.info(`${fc.name} 这次没接话`); return; }
    await saveData(d);
    refreshOnView(dd => dd.currentRoute === 'view' && dd.routeContext && dd.routeContext.postId === postId);
    toastr.success(`${fc.name} 回复了 ${n} 条评论`);
    const detail = replyLog.join(';');
    const meta = castKnows(fc) ? '' : ` ${castMetaUserNote(fc, d)}`;
    try { await syncToMain(`[小红书]${postRef(fpost, d)} 评论区:出场角色「${fc.name}」回复了 ${n} 条评论——${detail}。${meta}`, d.syncHidden); } catch (e) {}
  }

  async function resetSusp() {
    const d = loadData();
    d.charSuspicion = 0;
    d.charClues = [];
    await saveData(d);
    refreshXhs();
    toastr.success('怀疑度和线索已清零');
  }

  async function revealLurk() {
    const d = loadData();
    if (!d.charLurk) return toastr.info('没开潜伏模式');
    const alias = d.charLurkAlias || '神秘群友';
    d.charLurk = false;
    await saveData(d);
    refreshXhs();
    await forceSyncToMain(`[小红书] {{user}} 发现:一直潜在自己粉丝群里的那个「${alias}」,其实是 {{char}} 本人——{{char}} 偷偷围观 {{user}} 的事被揭穿了。`);
    toastr.success('已揭穿(写进主线)');
  }

  // 让 AI 生成 char 的小红书签名(优先看世界书有没有明写,否则按人设编)
  async function genCharBio(silent) {
    const d = loadData();
    const cname = charDisplayName(d);
    if (!silent) toastr.info('正在生成签名…');
    const role = getRoleDesc();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const plot = await buildContextSnippet();
    const sys = `给小红书角色「${cname}」写一句【个性签名】(就是主页名字下面那行小字)。
要求:15字以内,符合 ta 的性格/身份/气质,有网感,像真人会写的签名,不要加引号、不要解释。
- 【贴合 ta 此刻的心情/状态】:结合下面最近剧情判断 ta 现在是什么心境(开心/烦躁/想念某人/低落/嘴硬/患得患失…),让签名含蓄地透出那点情绪,但别直白点名是谁、别剧透,仍要像 ta 本人会写的、符合人设。
- 如果材料里【已经明确写了 ta 的签名/个签/座右铭】且和当前心情不冲突,可直接用那句(微调到15字内)。
${role ? `角色人设: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/资料(找找有没有现成签名): ${wb}\n` : ''}${plot ? `最近剧情(用来判断 ta 此刻的心情/状态): ${plot}\n` : ''}
只输出签名这一句本身。`;
    const raw = await callXhsAPI(sys, `给 ${cname} 写签名`);
    if (!raw) return;
    const bio = String(raw).replace(/^["'「『]|["'」』]$/g, '').split('\n')[0].trim().slice(0, 40);
    if (!bio) { if (!silent) toastr.warning('没生成出来,再试一次'); return; }
    const fresh = loadData();
    fresh.charBio = bio;
    await saveData(fresh);
    refreshXhs();
    if (!silent) toastr.success(`✓ 签名:${bio}`);
  }

  // 把某条私信标记/取消为 char 的马甲(user 不知道这号其实是 char)
  async function setCharAlt(dmId, on) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    dm.charAlt = !!on;
    if (!on) { dm.charAltRevealed = false; dm.charAltLurk = false; }
    d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success(on ? `已设为 ${charDisplayName(d)} 的马甲,回复会按 ta 伪装来生成` : '已取消马甲标记');
  }

  // 让/取消让这个马甲小号也潜进 user 的小红书粉丝群(用同一个名字,按 char 性格冒泡)
  async function toggleCharAltLurk(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !dm.charAlt) return;
    dm.charAltLurk = !dm.charAltLurk;
    d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success(dm.charAltLurk
      ? `已让小号「${dm.name}」潜进你的粉丝群,下次在群里点「生成回复」时,它会按 ${charDisplayName(d)} 的性格决定冒不冒泡`
      : `已取消小号「${dm.name}」潜群`);
  }

  // 揭穿:让 user 发现这个小号其实是 char,写进主线
  async function revealCharAlt(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm || !dm.charAlt) return;
    const cname = charDisplayName(d);
    dm.charAltRevealed = true;
    d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    await forceSyncToMain(`[小红书·私信] {{user}} 发现了:一直私信 ta 的小号「${dm.name}」,其实是 {{char}} 本人的马甲。{{char}} 用这个号瞒着 {{user}} 接近 ta 的事,被 {{user}} 揭穿了。`);
    toastr.success(`已揭穿:「${dm.name}」=${cname}(已写进主线)`);
  }

  // 从主线导入 char 通过小红书私信发给 user 的消息,同步进小红书里和 ta 的私信
  async function importXhsCharMsgs() {
    const useST = !!loadData().useStoryTime;
    const cname = charDisplayName(loadData());
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到主线上下文'); return; }
    toastr.info(`正在从主线提取 ${cname} 的小红书私信…`);
    const timeAsk = useST ? '\n- 另外给每条加一个 "time" 字段 = 这条消息【在剧情里发生的时间】(如 "5月20日 19:30"、"第二天早上";读不出就给 "")。' : '';
    const sys = `下面是一段角色扮演主线剧情。请把其中「${cname}」(也就是 {{char}})和「{{user}}」之间【通过小红书私信打字发的消息】抽出来,还原成一段聊天记录(按先后顺序)。
- 【尽量抓全】:凡是 ta 俩【在小红书私信里打字发的/收到的】内容都要抓——不光直接打引号的,【被旁白转述的也要抓】(如"他私信回了句…""她发来一条说…"),把转述【还原成实际发出的那句话】;短句、语气词、单个表情也别漏。
- 但只算【小红书私信里打字发的】:当面说的话、动作、旁白、心理不算;也不要把微信/短信里的消息算进来;剧情里没有"小红书私信"这回事就返回空数组。
- 【仔细分辨发送者,别丢】:逐条判断是 ${cname} 发的还是 {{user}} 发的;role 用 "char"(${cname} 发的)或 "user"({{user}} 发的);拿不准就按上下文最合理的归属,别因为拿不准就把这条丢掉。
- 长的一段可拆成几条短消息。${timeAsk}
只输出严格 JSON,不要解释、不要 markdown: {"chatlog":[{"role":"char或user","text":"消息内容"${useST ? ',"time":"剧情时间(读不出就空)"' : ''}}]}
主线剧情:
${ctx}`;
    const raw = await callXhsAPI(sys, '提取 char 的小红书私信', { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { chatlog: [] });
    const log = (Array.isArray(j.chatlog) ? j.chatlog : [])
      .map(x => ({ role: x.role === 'user' ? 'me' : 'npc', text: String(x.text || '').trim(), time: String(x.time || '').trim() }))
      .filter(x => x.text).slice(0, 30);
    if (!log.length) { toastr.warning(`主线里没读到 ${cname} 发的小红书私信,确认剧情里 ta 真的在小红书私信里发了消息再试`); return; }
    const d = loadData();
    const dm = getCharDm(d);
    const dmlog = dedupImportLog(dm, log);
    if (!dmlog.length) { toastr.info('这些消息之前都导入过了,没有新内容'); return; }
    const tk0 = Date.now();
    dmlog.forEach((m, i) => { dm.messages.push({ role: m.role, text: m.text, time: tk0 + i * 1000, st: (useST && m.time) ? m.time.slice(0, 40) : stStamp(d) }); });
    const reordered = useST ? sortChatByStoryTime(dm.messages) : false;
    dm.lastTime = Date.now();
    dm.unread = dmlog.some(m => m.role === 'npc');
    d.currentApp = 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    const charN = dmlog.filter(m => m.role === 'npc').length;
    const skipped = log.length - dmlog.length;
    toastr.success(`✓ 已导入 ${dmlog.length} 条(${cname} ${charN} 条)${skipped > 0 ? `,跳过 ${skipped} 条重复` : ''}${reordered ? ',已按剧情时间排好' : ''},已同步进小红书私信`);
  }

  // 从主线导入 char 通过手机/微信发给 user 的消息,同步进微信里和 ta 的对话
  // 导入去重:同一条已经在这条对话里就跳过。比对时先【归一化】(抹掉空格/标点/引号/大小写),
  // 这样"同一句话的不同写法"(标点/拆句差异)也能判成重复,不再漏判。
  function normMsgText(t) {
    return String(t || '')
      .replace(/\s+/g, '')
      .replace(/[，,。.！!？?、；;：:""''「」『』《》（）()【】\[\]…—~～\-·、]/g, '')
      .toLowerCase()
      .trim();
  }
  function dedupImportLog(dm, log) {
    const seen = new Set((dm.messages || []).map(m => (m.role || '') + '\u0001' + normMsgText(m.text)));
    const out = [];
    (log || []).forEach(m => {
      const n = normMsgText(m.text);
      if (!n) return; // 归一化后空(纯标点)就丢
      const key = (m.role || '') + '\u0001' + n;
      if (!seen.has(key)) { seen.add(key); out.push(m); }
    });
    return out;
  }
  async function importWxCharMsgs() {
    const useST = !!loadData().useStoryTime;
    const cname = getCharName();
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到主线上下文'); return; }
    toastr.info(`正在从主线提取 ${cname} 的微信消息…`);
    const timeAsk = useST ? '\n- 另外给每条加一个 "time" 字段 = 这条消息【在剧情里发生的时间】(如 "5月20日 19:30"、"第二天早上";读不出就给 "")。' : '';
    const sys = `下面是一段角色扮演主线剧情。请把其中「${cname}」(也就是 {{char}})和「{{user}}」之间【通过手机/微信/短信打字发的消息】抽出来,还原成一段微信聊天记录(按先后顺序)。
- 【尽量抓全】:凡是 ta 俩【隔着手机打字发的/收到的】内容都要抓——不光直接打引号的消息,【被旁白转述的也要抓】(如"他回了句改天约""她秒回了个'好'""微信上说在加班"),把转述【还原成 ta 当时实际发出的那句话】。短句、语气词、单个表情也别漏。
- 但只算【打字发的】:当面说的话、打电话/语音通话、动作、心理、纯旁白叙述本身不算;【也不要把小红书私信里的消息算进来】(那是另一个 app)。剧情里没有"发微信消息"这回事就返回空数组。
- 【仔细分辨发送者,别丢】:逐条判断是 ${cname} 发的还是 {{user}} 发的(看"他/她/${cname} 说·发·回"和"{{user}} 说·发·回""我回道"等线索);role 用 "char"(${cname} 发的)或 "user"({{user}} 发的);拿不准发送者就按上下文最合理的归属,【别因为拿不准就把这条丢掉】。
- 长的一段可拆成几条短消息,像真人发微信。${timeAsk}
只输出严格 JSON,不要解释、不要 markdown: {"chatlog":[{"role":"char或user","text":"消息内容"${useST ? ',"time":"剧情时间(读不出就空)"' : ''}}]}
主线剧情:
${ctx}`;
    const raw = await callXhsAPI(sys, '提取 char 的微信消息', { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { chatlog: [] });
    const log = (Array.isArray(j.chatlog) ? j.chatlog : [])
      .map(x => ({ role: x.role === 'user' ? 'me' : 'npc', text: String(x.text || '').trim(), time: String(x.time || '').trim() }))
      .filter(x => x.text).slice(0, 30);
    if (!log.length) { toastr.warning(`主线里没读到 ${cname} 发的微信消息,确认剧情里 ta 真的发了消息再试`); return; }
    const d = loadData();
    const dm = getWxCharDm(d);
    const dmlog = dedupImportLog(dm, log);
    if (!dmlog.length) { toastr.info('这些消息之前都导入过了,没有新内容'); return; }
    const tk0 = Date.now();
    dmlog.forEach((m, i) => { dm.messages.push({ role: m.role, text: m.text, time: tk0 + i * 1000, st: (useST && m.time) ? m.time.slice(0, 40) : stStamp(d) }); });
    const reordered = useST ? sortChatByStoryTime(dm.messages) : false;
    dm.lastTime = Date.now();
    dm.unread = dmlog.some(m => m.role === 'npc');
    d.currentApp = 'wx';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    const charN = dmlog.filter(m => m.role === 'npc').length;
    const skipped = log.length - dmlog.length;
    toastr.success(`✓ 已导入 ${dmlog.length} 条(${cname} ${charN} 条)${skipped > 0 ? `,跳过 ${skipped} 条重复` : ''}${reordered ? ',已按剧情时间排好' : ''},已同步进微信`);
  }

  // 多人卡:从主线提取【某个出场角色】和 user 之间的微信/小红书私信(按对话所属角色 + 渠道自动判定)
  async function importCastMsgs(dmId) {
    const d0 = loadData();
    const dm0 = (d0.dms || []).find(x => x.id === dmId);
    if (!dm0 || !dm0.castId) return;
    const cm = castOf(d0, dm0);
    if (!cm) return toastr.info('这不是出场角色的对话');
    const useST = !!d0.useStoryTime;
    const cname = cm.name;
    const isWx = dm0.app === 'wx';
    const surfLabel = isWx ? '手机/微信/短信打字发的消息' : '小红书私信里打字发的消息';
    const surfName = isWx ? '微信' : '小红书私信';
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到主线上下文'); return; }
    toastr.info(`正在从主线提取 ${cname} 的${surfName}消息…`);
    const timeAsk = useST ? '\n- 另外给每条加一个 "time" 字段 = 这条消息【在剧情里发生的时间】(如 "5月20日 19:30"、"第二天早上";读不出就给 "")。' : '';
    const sys = `下面是一段角色扮演主线剧情。请把其中【出场角色「${cname}」】和「{{user}}」之间【通过${surfLabel}】抽出来,还原成一段聊天记录(按先后顺序)。
- 【只挑「${cname}」和 {{user}} 之间的】:别把卡里【其他角色】的消息算进来。
- 【尽量抓全】:凡是 ta 俩【通过${surfLabel}发的/收到的】内容都要抓——不光直接打引号的,【被旁白转述的也要抓】(如"ta 回了句…""ta 发来…"),把转述【还原成实际发出的那句话】;短句、语气词、单个表情也别漏。
- 但只算【这个渠道打字发的】:当面说的话、动作、旁白、心理不算;${isWx ? '也别把小红书私信里的算进来' : '也别把微信/短信里的算进来'};剧情里没有这种消息就返回空数组。
- 【仔细分辨发送者,别丢】:逐条判断是 ${cname} 发的还是 {{user}} 发的;role 用 "char"(${cname} 发的)或 "user"({{user}} 发的);拿不准就按上下文最合理的归属,别因为拿不准就把这条丢掉。
- 长的一段可拆成几条短消息。${timeAsk}
只输出严格 JSON,不要解释、不要 markdown: {"chatlog":[{"role":"char或user","text":"消息内容"${useST ? ',"time":"剧情时间(读不出就空)"' : ''}}]}
主线剧情:
${ctx}`;
    const raw = await callXhsAPI(sys, `提取 ${cname} 的${surfName}消息`, { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { chatlog: [] });
    const log = (Array.isArray(j.chatlog) ? j.chatlog : [])
      .map(x => ({ role: x.role === 'user' ? 'me' : 'npc', text: String(x.text || '').trim(), time: String(x.time || '').trim() }))
      .filter(x => x.text).slice(0, 30);
    if (!log.length) { toastr.warning(`主线里没读到 ${cname} 发的${surfName}消息,确认剧情里 ta 真的发了再试`); return; }
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const dmlog = dedupImportLog(dm, log);
    if (!dmlog.length) { toastr.info('这些消息之前都导入过了,没有新内容'); return; }
    const tk0 = Date.now();
    dmlog.forEach((m, i) => { dm.messages.push({ role: m.role, text: m.text, time: tk0 + i * 1000, st: (useST && m.time) ? m.time.slice(0, 40) : stStamp(d) }); });
    const reordered = useST ? sortChatByStoryTime(dm.messages) : false;
    dm.lastTime = Date.now();
    dm.unread = dmlog.some(m => m.role === 'npc');
    d.currentApp = isWx ? 'wx' : 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    const charN = dmlog.filter(m => m.role === 'npc').length;
    const skipped = log.length - dmlog.length;
    toastr.success(`✓ 已导入 ${dmlog.length} 条(${cname} ${charN} 条)${skipped > 0 ? `,跳过 ${skipped} 条重复` : ''}${reordered ? ',已按剧情时间排好' : ''},已同步进${surfName}`);
  }

  // 从主线导入 char 偷偷建的小号 + ta 用这个号发的私信
  async function importCharAlt() {
    const cname = charDisplayName(loadData());
    const ctx = await buildContextSnippet();
    if (!ctx) { toastr.info('暂时读不到主线上下文'); return; }
    toastr.info(`正在从主线找 ${cname} 的小号…`);
    const sys = `下面是一段角色扮演主线剧情。请判断:其中「${cname}」(也就是 {{char}})是不是【偷偷新建/使用了一个小号马甲】给「{{user}}」发小红书私信。
- 如果有:给出这个小号的名字(alias),以及 {{char}} 用这个小号发给 {{user}} 的私信内容(messages 数组,按先后顺序;只要 {{char}} 用小号说出的话,别把 {{user}} 的话或旁白写进去)。
- 如果剧情里没有这回事:alias 返回空字符串。
只输出严格 JSON,不要解释、不要 markdown: {"alias":"小号名(没有就空)","messages":["私信1","私信2"]}
主线剧情:
${ctx}`;
    const raw = await callXhsAPI(sys, '提取 char 的小号和私信', { noContext: true, noExtra: true });
    const j = tryParseJSON(raw, { alias: '', messages: [] });
    const alias = String(j.alias || '').trim().slice(0, 24);
    const msgs = (Array.isArray(j.messages) ? j.messages : []).map(t => String(t || '').trim()).filter(Boolean).slice(0, 12);
    if (!alias) { toastr.warning(`主线里没读到 ${cname} 用小号发私信,确认 ta 在主线里说了再试`); return; }
    const d = loadData();
    d.dms = d.dms || [];
    let dm = d.dms.find(x => !x.isChar && x.name === alias);
    if (!dm) {
      dm = { id: uid(), name: alias, persona: `(其实是 ${cname} 的马甲)`, app: 'xhs', messages: [], lastTime: Date.now(), unread: false };
      d.dms.unshift(dm);
    }
    dm.charAlt = true;
    dm.charAltRevealed = false;
    const tk0 = Date.now();
    msgs.forEach((t, i) => { dm.messages.push({ role: 'npc', text: t, time: tk0 + i * 1000, st: stStamp(d) }); });
    dm.lastTime = Date.now();
    dm.unread = true;
    d.currentApp = 'xhs';
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 已导入「${alias}」${msgs.length ? `(${msgs.length} 条私信)` : ''},已标记为 ${cname} 的马甲`);
  }

  // 手动让 char 识破马甲
  async function revealAlt() {
    const d = loadData();
    const cname = charDisplayName(d);
    if (d.charKnowsAlt === 'knows') return toastr.info(`${cname} 已经知道了`);
    d.charKnowsAlt = 'knows';
    d.charSuspicion = 100;
    await saveData(d);
    refreshXhs();
    await forceSyncToMain(`[小红书] {{char}}(账号「${cname}」) 发现了:那个一直在刷的小红书账号「${d.userName}」,其实就是 {{user}} 的马甲。{{char}} 现在知道了。`);
    toastr.success(`✓ ${cname} 识破了你的马甲(已写进主线)`);
  }

  // 让 char 在 feed 发一条自己的动态
  async function genCharPost() {
    const d = loadData();
    const cname = charDisplayName(d);
    toastr.info(`${cname} 正在发动态…`);
    const role = getRoleDesc();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const plot = await buildContextSnippet();
    const sys = `你扮演「${cname}」本人,在小红书发一条动态(帖子)。【完全代入「${cname}」本人】,严格按 ta 的【原人设】/性格/说话习惯来写,别自己加人设里没写的脾气。
${charXhsStyleLine(d)}${role ? `角色设定: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `当前剧情: ${plot}\n` : ''}
【非常重要·别脑补】这条动态只能基于上面【真实发生过/明说过】的剧情来发;【绝对不要捏造剧情里没出现过的细节】。举例:如果剧情只说"和「${d.userName}」去吃烤肉",就【不能】自己脑补成"「${d.userName}」非要点最辣的"这种剧情里根本没提过的情节。可以写此刻的心情/感受/氛围,但别把没发生的事当成真事写出来、别给对方安没说过的话或行为。
给: type("text"或"image")、title(<25字)、coverText(image帖写画面描述/text帖写大字句)、content(60~140字,ta的口吻)、tags(可空)${styleHint(d, true)}
严格 JSON: {"type":"text或image","title":"...","coverText":"...","content":"...","tags":["可选"]}`;
    const raw = await callXhsAPI(sys, `以 ${cname} 身份发帖`);
    if (!raw) return;
    const p = tryParseJSON(raw, {});
    const fresh = loadData();
    const type = p.type === 'text' ? 'text' : 'image';
    const post = {
      id: uid(), author: cname, isChar: true, type, bg: type === 'text' ? pickTextBg() : null,
      title: p.title || '', coverText: p.coverText || '', content: p.content || '',
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
      time: Date.now(), st: stStamp(fresh), likes: Math.floor(Math.random() * 3000) + 200, comments: [],
    };
    fresh.feed = [post, ...(fresh.feed || [])].slice(0, 40);
    await saveData(fresh);
    await forceSyncToMain(`[小红书] {{char}}(账号「${cname}」) 发了条动态${postRef(post, fresh, true)}`);
    refreshXhs();
    toastr.success(`✓ ${cname} 发了动态,正在生成评论…`);
    // 自动生成这条动态的 NPC 评论,不用再手点
    await generatePostComments(post.id);
    // 像历史帖一样,char 发完帖顺手回几条评论区里的评论
    await charReplyComments(post.id);
  }

  // 打开/创建与 char 的私信
  async function dmChar() {
    const d = loadData();
    const dm = getCharDm(d);
    await saveData(d);
    await navigate('dm-chat', { dmId: dm.id });
  }

  // ============ 发帖 ============
  function renderPublish(d) {
    const t = d.routeContext.pubType || 'image';
    if (t === 'chat') {
      const mode = d.routeContext.chatMode || 'diary';
      return `
        <div class="xhs-topbar">
          <button class="xhs-icon-btn" data-action="nav" data-route="feed">‹</button>
          <span style="font-weight:600">发布笔记</span>
          <button class="xhs-publish-btn" data-action="do-publish">生成并发布</button>
        </div>
        <div class="xhs-scroll" style="padding:14px">
          <div class="xhs-pub-type">
            <button class="xhs-pubtype-btn" data-action="set-pub-type" data-name="image">🖼 配图</button>
            <button class="xhs-pubtype-btn" data-action="set-pub-type" data-name="text">📝 文字</button>
            <button class="xhs-pubtype-btn xhs-pubtype-on" data-action="set-pub-type" data-name="chat">📋 对话</button>
          </div>
          <div class="xhs-set-help">把你和对象(char)的聊天记录自动做成"截图卡"分享,AI 会把旁白里的对话提炼成一句句微信消息。</div>
          <div class="xhs-pub-row">
            <label>截取最近几条对话</label>
            <input id="xhs-pub-chatn" type="number" min="2" max="20" value="${d.routeContext.chatN || 6}"/>
          </div>
          <div class="xhs-pub-row">
            <label>标题</label>
            <input id="xhs-pub-title" placeholder="记录一下今天的他 / 姐妹们这条怎么回啊…" maxlength="30"/>
          </div>
          <div class="xhs-pub-row">
            <label>正文</label>
            <textarea id="xhs-pub-content" rows="4" placeholder="写下你的心情,或你的纠结、想问大家的…"></textarea>
          </div>
        </div>
      `;
    }
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="feed">‹</button>
        <span style="font-weight:600">发布笔记</span>
        <button class="xhs-publish-btn" data-action="do-publish">发布</button>
      </div>
      <div class="xhs-scroll" style="padding:14px">
        <div class="xhs-pub-type">
          <button class="xhs-pubtype-btn ${t === 'image' ? 'xhs-pubtype-on' : ''}" data-action="set-pub-type" data-name="image">🖼 配图</button>
          <button class="xhs-pubtype-btn ${t === 'text' ? 'xhs-pubtype-on' : ''}" data-action="set-pub-type" data-name="text">📝 文字</button>
          <button class="xhs-pubtype-btn" data-action="set-pub-type" data-name="chat">📋 对话</button>
        </div>
        <div class="xhs-pub-row">
          <label>标题</label>
          <input id="xhs-pub-title" placeholder="一个吸引人的标题..." maxlength="30"/>
        </div>
        <div class="xhs-pub-row">
          <label>${t === 'text' ? '封面大字(会大字显示在彩色卡片上)' : '图片描述(这张图是什么画面,会显示在占位图上)'}</label>
          <input id="xhs-pub-cover" placeholder="${t === 'text' ? '想大字写的一句话...' : '例如:健身房镜子自拍 / 一桌火锅俯拍'}" maxlength="24"/>
        </div>
        <div class="xhs-pub-row">
          <label>正文</label>
          <textarea id="xhs-pub-content" rows="7" placeholder="${t === 'image' ? '写下你想说的话…' : '写下你的故事...'}"></textarea>
        </div>
        <div class="xhs-set-help">${t === 'image' ? '配图帖用灰色占位图,暂不支持上传真图' : '纯文字帖会做成随机配色的文字卡片,像小红书那种'}</div>
      </div>
    `;
  }

  async function clearFeed() {
    const TOP = getTop();
    const d = loadData();
    const n = (d.feed || []).length;
    if (!n) return toastr.info('首页本来就没有生成的帖子');
    if (!TOP.confirm(`确定清空首页 ${n} 条生成的帖子?(你自己发的笔记不受影响)`)) return;
    d.feed = [];
    await saveData(d);
    refreshXhs();
    toastr.success('已清空首页帖子');
  }

  // 一键重置:清空所有帖子(自己的+别人的)、评论、群聊;保留各项设置与 char/user 资料
  async function resetXhsContent() {
    const TOP = getTop();
    if (!TOP.confirm('一键重置?将清空【小红书】这些:\n· 所有帖子(自己发的 + 别人发的)\n· 所有评论\n· 小红书的粉丝群聊\n· 小红书上和陌生网友的私信\n\n会保留:平台基调/世界观、热梗、表情包、同人文&推送偏好、char 资料设定、你的资料设定。\n\n【微信完全不受影响】:微信好友(含世界书 NPC)、微信群、和 char 的私聊都【不会】被删。此操作不可撤销')) return;
    const d = loadData();
    d.feed = [];
    d.feedFetchTime = 0;
    d.myPosts = [];          // 评论存在帖子里,帖子清了评论也清了
    d.groups = (d.groups || []).filter(g => g.app === 'wx');           // 只清小红书粉丝群,微信群保留
    d.notifs = [];           // 评论/赞通知已无对应帖子
    d.dms = (d.dms || []).filter(x => x.isChar || x.app === 'wx'); // 清掉小红书陌生人私信;保留 char 私聊 + 所有微信好友(世界书NPC)
    d.npcProfiles = {};       // 别人主页缓存
    d.charPostsSeeded = false; // char 历史动态可重新生成
    d.charSuspicion = 0;       // 马甲怀疑度归零(帖子都没了,重新开始)
    d.charClues = [];
    d.routeContext = {};
    d.currentRoute = 'feed';
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 已重置:小红书帖子/评论/粉丝群/陌生私信已清;微信好友、群、设置全部保留');
  }

  // 编辑任意帖子的正文内容(自己的/路人/char/同人文都可)
  async function editPostBody(id) {
    const TOP = getTop();
    const d = loadData();
    const post = (d.myPosts || []).find(p => p.id === id) || (d.ficFeed || []).find(p => p.id === id) || (d.feed || []).find(p => p.id === id);
    if (!post) return toastr.info('找不到这篇笔记');
    const cur = String(post.content || '');
    const val = TOP.prompt('编辑这篇笔记的正文内容:', cur);
    if (val === null) return;
    post.content = String(val).slice(0, 5000);
    await saveData(d);
    refreshXhs();
    toastr.success('正文已更新');
  }

  async function deletePost(id) {
    const TOP = getTop();
    const d = loadData();
    const inMine = (d.myPosts || []).some(p => p.id === id);
    const post = (d.myPosts || []).find(p => p.id === id) || (d.ficFeed || []).find(p => p.id === id) || (d.feed || []).find(p => p.id === id);
    if (!post) return toastr.info('找不到这篇笔记');
    if (!TOP.confirm(`确定删除「${post.title || post.coverText || '这篇笔记'}」?删除后不可恢复。`)) return;
    d.myPosts = (d.myPosts || []).filter(p => p.id !== id);
    d.feed = (d.feed || []).filter(p => p.id !== id);
    d.ficFeed = (d.ficFeed || []).filter(p => p.id !== id);
    if (d.currentRoute === 'view' && d.routeContext && d.routeContext.postId === id) {
      const vb = d.viewBack;
      if (vb && vb.route && vb.route !== 'view') { d.currentRoute = vb.route; d.routeContext = vb.ctx || {}; }
      else { d.currentRoute = inMine ? 'profile' : 'feed'; d.routeContext = {}; }
    }
    await saveData(d);
    refreshXhs();
    toastr.success('已删除');
  }

  async function setPubType(t) {
    const d = loadData();
    d.routeContext.pubType = (t === 'text' || t === 'chat') ? t : 'image';
    await saveData(d);
    refreshXhs();
  }
  async function setChatMode(m) {
    const d = loadData();
    d.routeContext.chatMode = (m === 'help' ? 'help' : 'diary');
    const n = parseInt(readInputCache('xhs-pub-chatn'));
    if (n) d.routeContext.chatN = n;
    await saveData(d);
    refreshXhs();
  }
  async function setChatExtract(e) {
    const d = loadData();
    d.routeContext.chatExtract = (e === 'raw' ? 'raw' : 'refine');
    const n = parseInt(readInputCache('xhs-pub-chatn'));
    if (n) d.routeContext.chatN = n;
    await saveData(d);
    refreshXhs();
  }

  // 从主对话抓最近 n 条 user/char 对话
  function getRecentDialogue(n) {
    try {
      const ctx = getCtx();
      if (!ctx || !Array.isArray(ctx.chat)) return [];
      const msgs = ctx.chat.filter(m => !m.extra?.xhs_event && !m.data?.xhs_event && (m.mes || '').trim());
      return msgs.slice(-n).map(m => ({
        role: m.is_user ? 'user' : 'char',
        name: m.is_user ? '我' : (m.name || 'TA'),
        text: (m.mes || '').replace(/<[^>]+>/g, '').replace(/\*[^*]*\*/g, '').trim().slice(0, 300),
      })).filter(x => x.text);
    } catch (e) { return []; }
  }

  // 抓原始消息(保留旁白,给 AI 提炼用)
  function getRecentMessages(n) {
    try {
      const ctx = getCtx();
      if (!ctx || !Array.isArray(ctx.chat)) return [];
      const msgs = ctx.chat.filter(m => !m.extra?.xhs_event && !m.data?.xhs_event && (m.mes || '').trim());
      return msgs.slice(-n).map(m => ({
        role: m.is_user ? 'user' : 'char',
        name: m.is_user ? '我' : (m.name || 'TA'),
        text: (m.mes || '').replace(/<[^>]+>/g, '').trim().slice(0, 700),
      })).filter(x => x.text);
    } catch (e) { return []; }
  }

  // 把一条帖子格式化成结构化文本(标题/配图/正文),配图按帖子类型不同
  function postSyncText(p) {
    const lines = [`标题:${p.title || '(无标题)'}`];
    if (p.type === 'image') {
      lines.push(`配图:[一张配图] ${p.coverText || '(图片)'}`);
    } else if (p.type === 'chat') {
      const log = (p.chatlog || []).map(x => `${x.role === 'user' ? '我' : (p.charName || '对方')}:${x.text}`).join(' / ');
      lines.push(`配图:[聊天记录截图] ${log.slice(0, 400)}`);
    } else { // text 纯文字帖
      if (p.coverText) lines.push(`封面大字:${p.coverText}`);
    }
    lines.push(`正文:${(p.content || '').slice(0, 400)}`);
    if (p.tags && p.tags.length) lines.push(`标签:${p.tags.map(t => '#' + t).join(' ')}`);
    return lines.join('\n');
  }

  async function doPublish() {
    const d0 = loadData();
    if ((d0.routeContext.pubType) === 'chat') return composeChatPost();
    const title = readInputCache('xhs-pub-title');
    const cover = readInputCache('xhs-pub-cover');
    const content = readInputCache('xhs-pub-content');
    if (!title || !content) return toastr.warning('标题和正文不能为空');
    const d = loadData();
    const type = d.routeContext.pubType === 'text' ? 'text' : 'image';
    const post = {
      id: uid(),
      author: d.userName,
      type,
      bg: type === 'text' ? pickTextBg() : null,
      title,
      coverText: cover || title.slice(0, 18),
      content,
      time: Date.now(),
      st: stStamp(d),
      likes: 0,
      comments: [],
    };
    d.myPosts = d.myPosts || [];
    d.myPosts.unshift(post);
    await saveData(d);
    clearInputCache('xhs-pub-title');
    clearInputCache('xhs-pub-cover');
    clearInputCache('xhs-pub-content');
    await syncToMain(`[小红书] {{user}} 发布了一篇笔记:\n${postSyncText(post)}`, d.syncHidden);
    await navigate('feed');
    toastr.success('✓ 已发布,正在生成评论…');
    await generatePostComments(post.id);
  }

  // 把和 char 的对话做成"聊天截图帖"(标题/正文用户自己写,AI 只生成截图)
  async function composeChatPost() {
    const d = loadData();
    const mode = d.routeContext.chatMode || 'diary';
    const extract = d.routeContext.chatExtract || 'refine';
    const n = Math.max(2, Math.min(20, parseInt(readInputCache('xhs-pub-chatn')) || d.routeContext.chatN || 6));
    const title = (readInputCache('xhs-pub-title') || '').trim();
    const content = (readInputCache('xhs-pub-content') || '').trim();
    if (!title) return toastr.warning('给帖子写个标题吧');

    const srcMsgs = extract === 'refine' ? getRecentMessages(n) : getRecentDialogue(n);
    if (srcMsgs.length === 0) {
      return toastr.warning('没抓到主对话内容,先在主线和 char 聊几句再来');
    }
    const charName = srcMsgs.find(x => x.role === 'char')?.name || 'TA';

    let chatlog;
    if (extract === 'refine') {
      toastr.info('正在生成聊天截图…');
      const dialogueText = srcMsgs.map(x => `${x.role === 'user' ? '我' : charName}: ${x.text}`).join('\n');
      const sys = `下面是一段【文学化角色扮演对话】,含大量旁白/心理/动作描写。
把它【提炼还原成真实微信聊天】——只保留双方"实际说出口的话",丢掉旁白和心理描写;长的一段话可以拆成 2~3 条短消息(像真人发微信)。role 用 "user"(我) 或 "char"(对方)。保持原意和语气,不要新增剧情、不要写旁白。
严格 JSON,不要解释:
{"chatlog":[{"role":"user或char","text":"短消息"}]}`;
      const raw = await callXhsAPI(sys, dialogueText);
      const j = tryParseJSON(raw, {});
      chatlog = (j.chatlog || [])
        .map(x => ({ role: x.role === 'user' ? 'user' : 'char', name: x.role === 'user' ? '我' : charName, text: (x.text || '').trim() }))
        .filter(x => x.text);
      if (chatlog.length === 0) chatlog = getRecentDialogue(n); // 提炼失败兜底
    } else {
      chatlog = srcMsgs;
    }

    const post = {
      id: uid(),
      author: d.userName,
      type: 'chat',
      chatMode: mode,
      chatlog,
      charName,
      bg: pickTextBg(),
      title,
      coverText: mode === 'help' ? '在线等,挺急的' : '恋爱碎片',
      content: content || (mode === 'help' ? '在线等回复思路!' : '随手记录一下💕'),
      time: Date.now(),
      st: stStamp(loadData()),
      likes: 0,
      comments: [],
    };
    const fresh = loadData();
    fresh.myPosts = fresh.myPosts || [];
    fresh.myPosts.unshift(post);
    fresh.routeContext = {};
    await saveData(fresh);
    clearInputCache('xhs-pub-title');
    clearInputCache('xhs-pub-content');
    clearInputCache('xhs-pub-chatn');
    await syncToMain(`[小红书] {{user}} 发布了一篇${mode === 'help' ? '求助帖' : '恋爱日记'}(聊天截图):\n${postSyncText(post)}`, fresh.syncHidden);
    await navigate('view', { postId: post.id });
    toastr.success('✓ 已发布,点"让大家评论"看反应');
  }

  // ============ 粉丝群 ============
  function renderGroupList(d) {
    const groups = d.groups || [];
    const items = groups.map(g => `
      <div class="xhs-group-row" data-action="open-group" data-id="${g.id}">
        <div class="xhs-group-avatar" style="background:${randomColor(g.id)}">${esc(g.name[0])}</div>
        <div class="xhs-group-info">
          <div class="xhs-group-name">${esc(g.name)}</div>
          <div class="xhs-group-meta">${g.members.length} 人 · ${g.chat.length} 条消息</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="feed">‹</button>
        <span style="font-weight:600">粉丝群</span>
        <button class="xhs-icon-btn" data-action="create-group" title="新建群">➕</button>
      </div>
      <div class="xhs-scroll">
        ${items || '<div class="xhs-empty">还没有粉丝群<br/>点右上 ➕ 创建一个</div>'}
      </div>
    `;
  }

  async function createGroup() {
    const TOP = getTop();
    const d = loadData();
    const base = `${d.userName}的粉丝群`;
    const n = (d.groups || []).filter(g => (g.name || '').startsWith(base)).length + 1;
    const name = TOP.prompt('粉丝群名字:', `${base}${n}号`);
    if (!name) return;
    await buildGroup(name, '', 0);
  }

  // 把某篇帖子的热度【导流进现有的粉丝群】(不新建群),没满的群里挑最满的那个进人
  async function boostGroupFromPost(postId) {
    const TOP = getTop();
    const d = loadData();
    const post = findPost(d, postId);
    if (!post) return;
    const groups = (d.groups || []);
    if (groups.length === 0) {
      if (TOP.confirm('你还没有粉丝群~ 粉丝群要在「我」的主页建。现在去建一个?')) {
        d.currentRoute = 'profile'; d.routeContext = {}; await saveData(d); refreshXhs();
      }
      return;
    }
    const open = groups
      .filter(g => (g.memberCount || (g.members || []).length) < 500)
      .sort((a, b) => (b.memberCount || b.members.length) - (a.memberCount || a.members.length))[0];
    if (!open) {
      if (TOP.confirm('你的粉丝群都满 500 人啦。要去主页再建一个新群吗?')) {
        d.currentRoute = 'profile'; d.routeContext = {}; await saveData(d); refreshXhs();
      }
      return;
    }
    const cur = open.memberCount || (open.members || []).length;
    const add = Math.min(500 - cur, 10 + Math.floor((post.likes || 0) / 30) + Math.floor(Math.random() * 30));
    open.memberCount = cur + add;
    open.topic = post.type === 'image'
      ? `${post.title}(这是【图片笔记】,配图画面:${String(post.coverText || '').slice(0, 40)};群友是在看这张图) —— ${(post.content || '').slice(0, 100)}`
      : `${post.title} —— ${(post.content || '').slice(0, 120)}`;
    open.chat.push({ role: 'sys', text: `${add} 位新成员因为你的帖子《${(post.title || '笔记').slice(0, 12)}》进群了`, time: Date.now() });
    if (open.memberCount >= 500) open.chat.push({ role: 'sys', text: '群成员已满 500 人 🎉 想再开一个可以去主页建', time: Date.now() + 1 });
    d.currentRoute = 'group-chat';
    d.routeContext = { groupId: open.id };
    await saveData(d);
    refreshXhs();
    toastr.success(`已把热度导入「${open.name}」,+${add} 人(点 ✨ 让群友聊这篇帖)`);
  }

  // 粉丝只看过楼主公开发的小红书内容——给群成员的"可知范围",没有帖子就返回空
  function myPostsBrief(d) {
    const ps = (d.myPosts || []);
    if (!ps.length) return '';
    // 粉丝在主页能看到楼主【所有】帖子:全部都列出来(近 8 篇带内容摘要,其余给标题,避免爆 token)
    return ps.map((p, i) => {
      const title = p.title || (p.type === 'chat' ? '聊天记录' : '无题');
      if (i < 8) {
        if (p.type === 'chat') return `《${title}》(聊天截图:${(p.chatlog || []).map(x => x.text || (x.sticker ? '[表情]' : '')).filter(Boolean).join('/').slice(0, 50)})`;
        if (p.type === 'image') return `《${title}》[图片笔记·画面:${String(p.coverText || '').slice(0, 30)}]${p.content ? ':' + String(p.content).slice(0, 50) : ''}`;
        return `《${title}》${p.content ? ':' + String(p.content).slice(0, 50) : ''}`;
      }
      return `《${title}》`;
    }).join('；');
  }
  function fanKnowRule(d, topic) {
    const brief = myPostsBrief(d);
    const gLine = (d.userGender && d.userGender !== '保密')
      ? `\n【楼主性别】楼主「${d.userName}」主页公开显示是【${d.userGender}生】,粉丝主页都看得到,称呼和默认性别【别搞错】(该叫姐姐/哥哥/小姐姐等按这个来)。\n`
      : '';
    const bioTxt = (d.userBio || '').trim();
    const bLine = bioTxt
      ? `\n【楼主主页签名】楼主「${d.userName}」的个性签名是:「${bioTxt}」。⚠这是【签名/简介,不是 ta 的名字】,别拿签名内容当名字称呼 ta;称呼请用「${d.userName}」。可作了解 ta 性格的线索,但【别据此编造】没写过的私事。\n`
      : '';
    const head = gLine + bLine;
    if (topic) return head + `\n【粉丝只看过楼主「${d.userName}」公开发的内容】这个群是冲着上面那篇帖子来的,可以围绕它聊;${brief ? `楼主还发过:${brief};` : ''}【严禁】编造楼主没公开发过的私事/行程/感情/聊天记录/主线剧情。\n【严禁脑补评论区/旧事】你们【只看得到上面列出的帖子内容本身】,【看不到评论区、也不知道楼主台面下的事】。所以【绝对禁止】编造或转述"评论区里谁说了什么""某人(如竹马哥/某网友)在评论里翻旧账/爆料""楼主的某段旧事(如怕什么、看过什么、和谁发生过什么)"——只要不在上面给出的帖子摘要或群聊里,就一个字都不许说,要聊就只就【确实给出的帖子内容】聊。\n`;
    if (brief) return head + `\n【粉丝只看过楼主「${d.userName}」公开发的小红书笔记】ta 发过这些(可以围绕这些催更、讨论、玩梗):${brief}\n【严禁】提及或编造楼主没发过的私事/面试/工作/对象/聊天记录/任何主线剧情,只能聊 ta 公开发过的内容。\n【严禁脑补评论区/旧事】你们【只看得到上面这些帖子内容本身】,【看不到评论区、也不知道楼主台面下的事】,【绝对禁止】编造"评论区里谁说了什么""某人(如竹马哥/某网友)在评论里翻旧账/爆料""楼主某段没写出来的旧事(如怕什么、看过什么、和谁怎样)"——不在上面给出的内容里,就不许凭空说。\n`;
    return head + `\n【非常重要】楼主「${d.userName}」目前【还没发过任何笔记】,这个粉丝群是刚建的、大家彼此也不熟。所以【绝对禁止】提到楼主发过什么、面试、工作、对象、crush、聊天记录、行程等【任何具体内容】(因为根本不存在,凭空说出来就是穿帮)。就当一群刚进群的陌生粉丝随便寒暄、自我介绍、闲聊、好奇并期待楼主以后发东西。【禁止编造】楼主的任何经历。\n`;
  }

  async function buildGroup(name, topic, startCount) {
    toastr.info('AI 正在拉群成员…');
    const d0 = loadData();
    const topicLine = topic ? `这个群是围绕这篇热帖建立的,大家进来讨论更多细节:「${topic}」\n` : '';
    const sys = `生成一个名为「${name}」的小红书粉丝群初始成员。这是一群只在小红书上关注楼主的【陌生粉丝】。
${topicLine}${fanKnowRule(d0, topic)}
要求:
1. 生成 6~10 个 NPC 成员,每个有 name 和 persona(20字内人设)
2. 给出 4~6 条开场对话,体现群氛围${topic ? '(围绕上面那篇帖子聊)' : '(刚建群,粉丝们寒暄/自我介绍/闲聊,别提楼主没公开发过的具体内容)'}
${xhsNameRule()}
3. 严格JSON: {"members":[{"name":"昵称","persona":"人设"}],"opening":[{"name":"昵称","text":"消息"}]}`;
    const raw = await callXhsAPI(sys, `群名: ${name}`, { noContext: true });
    if (!raw) return;
    const json = tryParseJSON(raw, { members: [], opening: [] });
    const d = loadData();
    d.groups = d.groups || [];
    const members = (json.members || []).slice(0, 16);
    const group = {
      id: uid(),
      name,
      topic: topic || '',
      members,
      memberCount: Math.max(startCount || 0, members.length, 6),
      chat: (json.opening || []).map(m => ({
        role: 'npc', name: m.name, text: m.text,
        time: Date.now() - Math.floor(Math.random() * 600000),
      })),
    };
    d.groups.push(group);
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ 群「${name}」已建,${group.memberCount} 人`);
  }

  // ============ 聊天通用组件(粉丝群 & 陌生人私信共用) ============
  // 单条消息气泡:头像(可点进主页) + 文字/语音/图片/红包
  function chatBubble(m, d, opts) {
    opts = opts || {};
    if (m.role === 'sys') return `<div class="xhs-grp-sys">${esc(m.text)}</div>`;
    if (m.role === 'heart') {
      const heartMenu = (opts.idx != null && opts.delIdx === opts.idx)
        ? `<div class="xhs-heart-row" style="margin-top:-4px"><div class="xhs-msg-menu"><button data-action="del-msg" data-idx="${opts.idx}">删除心声</button></div></div>`
        : '';
      return `<div class="xhs-heart-row"${opts.idx != null ? ` data-msgidx="${opts.idx}"` : ''}><div class="xhs-heart-bub">💭 <span class="xhs-heart-tag">${m.who ? esc(m.who) + '的心声' : '心声'}·只有你看得到</span><div class="xhs-heart-text">${esc(m.text)}</div></div></div>${heartMenu}`;
    }
    const isMe = m.role === 'me';
    const isWxApp = d.currentApp === 'wx';
    const meName = isWxApp ? (d.wxName || d.userName || '我') : (d.userName || '我');
    const meAv = isWxApp ? (d.wxAvatar || d.userAvatar) : d.userAvatar;
    const who = isMe ? meName : (opts.npcName || m.name || '?');
    const avCls = 'xhs-cmsg-av' + (isWxApp ? ' xhs-cmsg-av-wx' : '');
    const avatar = isMe
      ? `<div class="${avCls}">${avatarHtml(meAv, d.avatarBg, (meName || '我')[0])}</div>`
      : (opts.npcAvatar
        ? `<div class="${avCls}">${avatarHtml(opts.npcAvatar, randomColor(who), (who || '?')[0])}</div>`
        : (isWxApp
          ? `<div class="${avCls}"><span style="background:${randomColor(who)}">${esc((who || '?')[0])}</span></div>`
          : `<div class="${avCls}" data-action="open-user" data-name="${esc(who)}"><span style="background:${randomColor(who)}">${esc((who || '?')[0])}</span></div>`));
    let inner;
    if (m.kind === 'sticker') {
      inner = `<img class="xhs-sticker-msg" src="${esc(m.url)}" alt="${esc(m.name || '表情')}"/>`;
    } else if (m.kind === 'voice') {
      const showTxt = (!m.id || m.shown);
      const vBg = isMe ? (d.bubbleMe || '') : (d.bubbleOther || '');
      inner = `<div class="xhs-bubble xhs-bubble-voice" data-action="play-voice" data-id="${m.id || ''}"${vBg ? ` style="background:${esc(vBg)}"` : ''}>
          <div class="xhs-voice-top"><span class="xhs-voice-play">▶</span><span>${m.sec || 1}″</span></div>
          ${showTxt && m.text ? `<div class="xhs-voice-text">${esc(m.text)}</div>` : ''}
        </div>`;
    } else if (m.kind === 'image') {
      inner = `<div class="xhs-chatimg"><div class="xhs-chatimg-tag">🖼 图片</div>${esc(m.text || '图片')}</div>`;
    } else if (m.kind === 'transfer' || m.kind === 'red') {
      inner = `<div class="xhs-bubble xhs-bubble-transfer">
          <div class="xhs-tf-row"><span class="xhs-tf-ic">¥</span><div class="xhs-tf-mid"><div class="xhs-tf-amt">¥${esc(String(m.amount || 0))}</div>${m.note ? `<div class="xhs-tf-note">${esc(m.note)}</div>` : ''}</div></div>
          <div class="xhs-tf-foot">微信转账</div>
        </div>`;
    } else if (m.kind === 'share') {
      const s = m.share || {};
      const cv = s.type === 'text' || s.type === 'chat'
        ? `<div class="xhs-share-cv xhs-share-cv-text">${esc((s.coverText || s.title || '').slice(0, 24))}</div>`
        : `<div class="xhs-share-cv"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#c8c8c8" stroke-width="1.4"/><circle cx="8" cy="10" r="1.5" fill="#c8c8c8"/><path d="M3 17l5-5 4 4 3-3 6 6" stroke="#c8c8c8" stroke-width="1.4" fill="none"/></svg></div>`;
      inner = `<div class="xhs-bubble xhs-bubble-share" data-action="xhs-view" data-id="${esc(s.postId)}">
          <div class="xhs-share-flag">📕 笔记</div>
          <div class="xhs-share-body">
            ${cv}
            <div class="xhs-share-meta">
              <div class="xhs-share-title">${esc(s.title || '笔记')}</div>
              <div class="xhs-share-author">@${esc(s.author || '')}${s.isChar ? ' 💑' : ''}</div>
            </div>
          </div>
        </div>`;
    } else {
      const bubBg = isMe ? (d.bubbleMe || '') : (d.bubbleOther || '');
      inner = `<div class="xhs-bubble"${bubBg ? ` style="background:${esc(bubBg)}"` : ''}>${emojifyXhs(esc(m.text || ''))}</div>`;
    }
    const quoteBlock = m.quote ? `<div class="xhs-quote-ref">${m.quote.name ? `<b>${esc(m.quote.name)}</b>: ` : ''}${esc(String(m.quote.text || '').slice(0, 60))}</div>` : '';
    return `<div class="xhs-cmsg ${isMe ? 'xhs-cmsg-me' : 'xhs-cmsg-other'}"${opts.idx != null ? ` data-msgidx="${opts.idx}"` : ''}>
        ${avatar}
        <div class="xhs-cmsg-col">
          ${(!isMe && opts.showName) ? `<div class="xhs-cmsg-name">${esc(who)}</div>` : ''}
          ${quoteBlock}
          ${inner}
          ${(opts.idx != null && opts.delIdx === opts.idx) ? `<div class="xhs-msg-menu"><button data-action="msg-quote" data-idx="${opts.idx}">引用</button>${d.useStoryTime ? `<button data-action="msg-time" data-idx="${opts.idx}">改时间</button>` : ''}<button data-action="del-msg" data-idx="${opts.idx}">删除</button><button data-action="msg-multi" data-idx="${opts.idx}">多选</button></div>` : ''}
        </div>
      </div>`;
  }

  // 取一条消息的"引用快照"(谁说的+大致内容),给引用块显示用
  function chatMsgQuote(m, d) {
    const isWxApp = d.currentApp === 'wx';
    let name = (m.role === 'me') ? (isWxApp ? (d.wxName || d.userName || '我') : (d.userName || '我')) : (m.name || '');
    let text;
    if (m.kind === 'image') text = '[图片]' + (m.text ? ' ' + m.text : '');
    else if (m.kind === 'voice') text = '[语音]' + (m.text ? ' ' + m.text : '');
    else if (m.kind === 'transfer' || m.kind === 'red') text = '[转账]';
    else if (m.kind === 'sticker') text = '[表情]';
    else if (m.kind === 'share') text = '[笔记]' + ((m.share && m.share.title) ? ' ' + m.share.title : '');
    else text = m.text || '';
    return { name: String(name).slice(0, 24), text: String(text).slice(0, 60) };
  }
  // NPC 输出的 quote 字符串 → 解析成 {name,text}:在最近消息里模糊匹配出是谁说的
  function npcQuoteRef(arr, qstr, meName) {
    const q = String(qstr || '').trim().slice(0, 60);
    if (!q || q.length < 2) return null;
    let name = '';
    if (Array.isArray(arr)) {
      const probe = q.slice(0, 10);
      for (let i = arr.length - 1; i >= 0; i--) {
        const t = String(arr[i].text || '');
        if (t && (t.includes(q) || (probe.length > 3 && t.includes(probe)) || (t.length > 4 && q.includes(t.slice(0, 12))))) {
          name = (arr[i].role === 'me') ? (meName || '') : (arr[i].name || '');
          break;
        }
      }
    }
    return { name: String(name).slice(0, 24), text: q };
  }

  // 输入栏:左✨生成回复 + ➕ + 输入框 + 发送(纸飞机)
  function chatInputBar(kind, id, inputId, attachOpen, isWx) {
    const genAction = kind === 'group' ? 'gen-group-reply' : 'gen-dm-reply';
    const sendAction = kind === 'group' ? 'grp-send' : 'dm-send';
    let stickerTray = '';
    if (attachOpen) {
      const d = loadData();
      const stk = (d.stickers || []);
      stickerTray = stk.length
        ? `<div class="xhs-sticker-tray">${stk.map(s => `<img class="xhs-sticker-pick" src="${esc(s.url)}" title="${esc(s.name)}" data-action="send-sticker" data-kind="${kind}" data-id="${id}" data-url="${esc(s.url)}" data-name="${esc(s.name)}"/>`).join('')}</div>`
        : `<div class="xhs-set-help" style="padding:8px 14px">还没有表情包,去 设置→😀自定义表情包 添加</div>`;
    }
    const attach = attachOpen ? `
      <div class="xhs-attach-panel">
        <button class="xhs-attach-item" data-action="attach-transfer" data-id="${id}" data-kind="${kind}"><span class="xhs-attach-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9 9l3 3 3-3M12 12v4.5M9.5 13.5h5"/></svg></span><span>转账</span></button>
        <button class="xhs-attach-item" data-action="attach-image" data-id="${id}" data-kind="${kind}"><span class="xhs-attach-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.7"/><path d="M4 17l5-5 4 4 3-3 4 4"/></svg></span><span>图片</span></button>
        <button class="xhs-attach-item" data-action="attach-voice" data-id="${id}" data-kind="${kind}"><span class="xhs-attach-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg></span><span>语音</span></button>
      </div>
      ${stickerTray}` : '';
    const _qd = loadData();
    const _q = _qd.routeContext && _qd.routeContext.quoting;
    const quotePreview = _q ? `<div class="xhs-quote-bar"><span class="xhs-quote-bar-txt">引用 ${_q.name ? esc(_q.name) + ': ' : ''}${esc(String(_q.text || '').slice(0, 40))}</span><button class="xhs-quote-x" data-action="quote-cancel">×</button></div>` : '';
    return `
      ${attach}
      ${quotePreview}
      <div class="xhs-grp-input">
        <button class="xhs-chat-icon" data-action="${genAction}" data-id="${id}" title="生成回复">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" fill="#7c8aa0"/><circle cx="18" cy="17" r="2.4" stroke="#7c8aa0" stroke-width="1.4"/><path d="M18 15.6v2.8M16.6 17h2.8" stroke="#7c8aa0" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="xhs-chat-icon" data-action="toggle-attach" data-id="${id}" title="更多">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#7c8aa0" stroke-width="1.5"/><path d="M12 8v8M8 12h8" stroke="#7c8aa0" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <input id="${inputId}" placeholder="发消息…"/>
        <button class="xhs-chat-send ${isWx ? 'xhs-chat-send-wx' : ''}" data-action="${sendAction}" data-id="${id}" title="发送">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-7-7 16-2.5-6.5L4 12z" fill="#fff"/></svg>
        </button>
      </div>`;
  }

  // 往群/私信里插入一条用户消息
  async function insertChatMessage(kind, id, msg) {
    const d = loadData();
    if (kind === 'group') {
      const g = (d.groups || []).find(x => x.id === id);
      if (!g) return;
      g.chat.push(Object.assign({ role: 'me', name: d.userName, time: Date.now(), st: stStamp(d) }, msg));
    } else {
      const dm = (d.dms || []).find(x => x.id === id);
      if (!dm) return;
      dm.messages.push(Object.assign({ role: 'me', time: Date.now(), st: stStamp(d) }, msg));
      dm.lastTime = Date.now();
    }
    d.routeContext.attachOpen = false;
    await saveData(d);
    refreshXhs();
  }

  async function toggleAttach(id) {
    const d = loadData();
    d.routeContext.attachOpen = !d.routeContext.attachOpen;
    await saveData(d);
    refreshXhs();
  }

  async function attachTransfer(kind, id) {
    const TOP = getTop();
    const amount = TOP.prompt('转账金额(元):', '5.20');
    if (amount === null) return;
    const note = TOP.prompt('转账说明(可留空):', '');
    if (note === null) return;
    await insertChatMessage(kind, id, { kind: 'transfer', amount: amount.trim(), note: note.trim() });
  }
  async function attachImage(kind, id) {
    const TOP = getTop();
    const text = TOP.prompt('图片描述(会显示成一张配文字的图):', '');
    if (text === null || !text.trim()) return;
    await insertChatMessage(kind, id, { kind: 'image', text: text.trim() });
  }
  async function attachVoice(kind, id) {
    const TOP = getTop();
    const sec = TOP.prompt('语音秒数:', '2');
    if (sec === null) return;
    const text = TOP.prompt('语音内容(文字):', '');
    if (text === null || !text.trim()) return;
    await insertChatMessage(kind, id, { kind: 'voice', id: uid(), sec: parseInt(sec) || 1, text: text.trim() });
  }
  async function toggleVoice(msgId) {
    if (!msgId) return;
    const d = loadData();
    let arr = null;
    if (d.currentRoute === 'group-chat') { const g = (d.groups || []).find(x => x.id === d.routeContext.groupId); arr = g && g.chat; }
    else { const dm = (d.dms || []).find(x => x.id === d.routeContext.dmId); arr = dm && dm.messages; }
    if (!arr) return;
    const m = arr.find(x => x.id === msgId);
    if (!m) return;
    m.shown = !m.shown;
    await saveData(d);
    refreshXhs();
  }
  async function sendSticker(kind, id, url, name) {
    if (!url) return;
    await insertChatMessage(kind, id, { kind: 'sticker', url, name: name || '表情' });
  }

  // 当前会话(群聊或私信)的消息数组——删除/多选删除共用
  function currentChatArr(d) {
    if (d.currentRoute === 'group-chat') { const g = (d.groups || []).find(x => x.id === d.routeContext.groupId); return g ? g.chat : null; }
    const dm = (d.dms || []).find(x => x.id === d.routeContext.dmId); return dm ? dm.messages : null;
  }

  function renderGroupChat(d) {
    const id = d.routeContext.groupId;
    const group = (d.groups || []).find(g => g.id === id);
    if (!group) return notFoundScreen('群不见了', 'messages', 'messages');
    const isWxG = group.app === 'wx';
    const count = isWxG ? ((group.members || []).length + 1) : (group.memberCount || (group.members || []).length);
    const full = !isWxG && count >= 500;
    // 微信群:发言人显示用微信备注、头像用微信设置好的(char 用 char 的微信备注/头像)
    const wxCharDm = isWxG ? (d.dms || []).find(x => x.isChar && x.app === 'wx') : null;
    const wxContacts = isWxG ? wxList(d) : [];
    const grpName = (m) => {
      if (m.isChar) return (wxCharDm && wxCharDm.remark) || getCharName();
      const c = wxContacts.find(x => !x.isChar && (x.name === m.name || x.remark === m.name));
      return (c && c.remark) || m.name;
    };
    const grpAvatar = (m) => {
      if (m.isChar) return (wxCharDm && wxCharDm.avatar) || d.charAvatar || '';
      const c = wxContacts.find(x => !x.isChar && (x.name === m.name || x.remark === m.name));
      if (c && c.avatar) return c.avatar;
      const mem = (group.members || []).find(mm => mm.name === m.name);
      return (mem && mem.avatar) || '';
    };
    const grpOpts = (m, base) => {
      if (isWxG && m.role === 'npc') { base.npcName = grpName(m); const av = grpAvatar(m); if (av) base.npcAvatar = av; }
      return base;
    };
    // 多选删除模式(和私信一致)
    if (d.routeContext.delSelMode) {
      const delSet = new Set(d.routeContext.delSel || []);
      const delBubbles = group.chat.map((m, i) => {
        const prev = group.chat[i - 1];
        const sameAuthor = prev && prev.role === m.role && (prev.name || '') === (m.name || '') && m.role !== 'sys';
        const b = chatBubble(m, d, grpOpts(m, { showName: !sameAuthor }));
        if (m.role === 'sys') return b;
        const on = delSet.has(i);
        return `<div class="wx-sel-wrap ${on ? 'wx-sel-on' : ''}" data-action="del-sel-toggle" data-idx="${i}"><span class="wx-sel-box">${on ? '✓' : ''}</span><div class="wx-sel-inner">${b}</div></div>`;
      }).join('');
      return `
        <div class="xhs-topbar">
          <button class="xhs-icon-btn" data-action="del-sel-cancel">取消</button>
          <span style="font-weight:600">选要删除的消息</span>
          <span style="width:42px"></span>
        </div>
        <div class="xhs-grp-chat" id="xhs-grp-chat">${delBubbles}</div>
        <div class="wx-sel-bar">
          <span>已选 ${delSet.size} 条</span>
          <div style="display:flex;gap:8px">
            ${d.useStoryTime ? `<button class="xhs-publish-btn" data-action="del-sel-time" data-id="${id}" style="background:#7c8aa0${delSet.size ? '' : ';opacity:.5'}" ${delSet.size ? '' : 'disabled'}>改时间</button>` : ''}
            <button class="xhs-publish-btn" data-action="del-sel-confirm" data-id="${id}" style="background:#ff2442${delSet.size ? '' : ';opacity:.5'}" ${delSet.size ? '' : 'disabled'}>删除(${delSet.size})</button>
          </div>
        </div>`;
    }
    // 选消息发到小红书(复用 DM 的 wxSelect 模式)
    if (isWxG && d.routeContext.wxSelect) {
      const selSet = new Set(d.routeContext.wxSel || []);
      const selBubbles = group.chat.map((m, i) => {
        const prev = group.chat[i - 1];
        const sameAuthor = prev && prev.role === m.role && (prev.name || '') === (m.name || '') && m.role !== 'sys';
        const b = chatBubble(m, d, grpOpts(m, { showName: !sameAuthor }));
        if (m.role === 'sys' || m.role === 'heart') return b;
        const on = selSet.has(i);
        return `<div class="wx-sel-wrap ${on ? 'wx-sel-on' : ''}" data-action="wx-sel-toggle" data-idx="${i}"><span class="wx-sel-box">${on ? '✓' : ''}</span><div class="wx-sel-inner">${b}</div></div>`;
      }).join('');
      return `
        <div class="xhs-topbar wx-topbar">
          <button class="xhs-icon-btn" data-action="wx-sel-cancel">取消</button>
          <span style="font-weight:600">选要发的消息</span>
          <span style="width:42px"></span>
        </div>
        <div class="xhs-grp-chat" id="xhs-grp-chat">${selBubbles}</div>
        <div class="wx-sel-bar">
          <span>已选 ${selSet.size} 条</span>
          <button class="xhs-publish-btn" data-action="wx-sel-publish" data-id="${id}" ${selSet.size ? '' : 'disabled style="opacity:.5"'}>发到小红书</button>
        </div>`;
    }
    const bubbles = group.chat.map((m, i) => {
      const prev = group.chat[i - 1];
      const sameAuthor = prev && prev.role === m.role && (prev.name || '') === (m.name || '') && m.role !== 'sys';
      return storyTimeSep(d, m, prev) + chatBubble(m, d, grpOpts(m, { showName: !sameAuthor, idx: i, delIdx: d.routeContext.delIdx }));
    }).join('');
    const menuOpen = d.routeContext.groupMenuOpen;
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="${isWxG ? 'wx-chats' : 'messages'}">‹</button>
        <span style="font-weight:600">${esc(group.name)} (${count})${full ? ' · 已满' : ''}</span>
        <button class="xhs-icon-btn" data-action="group-menu" data-id="${id}" style="font-size:22px">⋯</button>
      </div>
      ${menuOpen ? `<div class="xhs-grp-menu">
        ${isWxG ? `<button data-action="rename-group" data-id="${id}">✏️ 修改群名</button>
        <button data-action="set-group-avatar" data-id="${id}">🖼 设置头像</button>
        <button data-action="wx-start-select" data-id="${id}">📤 选消息发到小红书</button>` : ''}
        <button data-action="set-chat-bg" data-id="${id}">🎨 设置聊天背景</button>
        <button data-action="clear-group-chat" data-id="${id}">🧹 清空聊天记录</button>
        <button data-action="dissolve-group" data-id="${id}" style="color:#ff2442">🗑 ${isWxG ? '删除会话' : '解散粉丝群'}</button>
      </div>` : ''}
      <div class="xhs-grp-chat" id="xhs-grp-chat"${chatBgStyle(group.chatBg)}>
        ${bubbles || '<div class="xhs-empty">还没有消息</div>'}
      </div>
      ${chatInputBar('group', id, 'xhs-grp-input', d.routeContext.attachOpen, isWxG)}
    `;
  }

  async function renameGroup(groupId) {
    const TOP = getTop(); const d = loadData();
    const group = (d.groups || []).find(g => g.id === groupId);
    if (!group) return;
    const v = TOP.prompt('新的群名称:', group.name || '');
    if (v === null || !v.trim()) { d.routeContext.groupMenuOpen = false; await saveData(d); return refreshXhs(); }
    group.name = v.trim().slice(0, 24);
    d.routeContext.groupMenuOpen = false;
    await saveData(d); refreshXhs();
    toastr.success('已修改群名');
  }
  async function setGroupAvatar(groupId) {
    const TOP = getTop(); const d = loadData();
    const group = (d.groups || []).find(g => g.id === groupId);
    if (!group) return;
    const v = TOP.prompt('群头像图片 URL(留空=用默认群图标):', group.avatar || '');
    if (v === null) { d.routeContext.groupMenuOpen = false; await saveData(d); return refreshXhs(); }
    group.avatar = v.trim().slice(0, 500);
    d.routeContext.groupMenuOpen = false;
    await saveData(d); refreshXhs();
    toastr.success('已更新群头像');
  }
  async function toggleGroupMenu() {
    const d = loadData();
    d.routeContext.groupMenuOpen = !d.routeContext.groupMenuOpen;
    await saveData(d);
    refreshXhs();
  }
  async function clearGroupChat(groupId) {
    const TOP = getTop();
    const d = loadData();
    const group = (d.groups || []).find(g => g.id === groupId);
    if (!group) return;
    if (!TOP.confirm(`清空「${group.name}」的聊天记录?(群和成员保留)`)) return;
    group.chat = [];
    d.routeContext.groupMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success('已清空聊天记录');
  }
  async function dissolveGroup(groupId) {
    const TOP = getTop();
    const d = loadData();
    const group = (d.groups || []).find(g => g.id === groupId);
    if (!group) return;
    const isWxG = group.app === 'wx';
    if (!TOP.confirm(`确定删除「${group.name}」?群和聊天记录都会删除,不可恢复。`)) return;
    d.groups = (d.groups || []).filter(g => g.id !== groupId);
    d.routeContext = {};
    d.currentApp = isWxG ? 'wx' : 'xhs';
    d.currentRoute = isWxG ? 'wx-chats' : 'messages';
    await saveData(d);
    refreshXhs();
    toastr.success(isWxG ? '已删除该群聊' : '已解散该粉丝群');
  }

  async function groupSend(groupId) {
    const text = readInputCache('xhs-grp-input');
    if (!text) return;
    const d = loadData();
    const group = d.groups.find(g => g.id === groupId);
    if (!group) return;
    const _gmsg = { role: 'me', name: d.userName, text, time: Date.now(), st: stStamp(d) };
    if (d.routeContext && d.routeContext.quoting) { _gmsg.quote = d.routeContext.quoting; d.routeContext.quoting = null; }
    group.chat.push(_gmsg);
    await saveData(d);
    clearInputCache('xhs-grp-input');
    refreshXhs();
    // 不在这里同步;等点 ✨(genGroupReply)时把这一轮发的消息打包进主线
  }

  // 单独生成 char 潜伏发言:用 ta 完整人设判断要不要冒泡 + 说什么,口吻贴合 char
  async function genLurkLine(groupName, recentChat, aliasOverride, opts) {
    opts = opts || {};
    const d = loadData();
    const cname = opts.realName || charDisplayName(d);
    const alias = aliasOverride || d.charLurkAlias || genLurkAlias();
    const role = opts.persona || getRoleDesc();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const plot = await buildContextSnippet();
    const sys = `你扮演「${cname}」本人。ta 用一个谁都认不出的马甲「${alias}」,偷偷潜伏在 ta 熟人/暗恋者「${d.userName}」的粉丝群「${groupName}」里,默默看着 ${d.userName},而 ${d.userName} 完全不知道这个马甲就是 ta。
【身份·务必记牢】这个粉丝群的楼主「${d.userName}」,就是你在下面剧情里认识/在意的那个人（{{user}}）【本人】——【同一个人】,只是 ta 在小红书上用「${d.userName}」这个号。所以群里只要是「${d.userName}」(楼主本人)在说话,你【一眼就知道那就是 {{user}}、那个你认识的人】,心里清清楚楚。【绝对不要】把「${d.userName}」当成不认识的陌生网友,也【绝对不要】把"群里的 ${d.userName}"和"你认识的 / 刚跟你聊过的 {{user}}"当成两个不同的人——你就是冲着 ta 来潜伏的。
${role ? `【${cname} 的人设/性格/说话习惯——发言必须严格贴合,不能 OOC】:\n${role}\n` : ''}${cworld ? `【世界观/背景】:\n${cworld}\n` : ''}${wb ? `【世界书】:\n${wb}\n` : ''}${plot ? `【${cname} 知道的主线剧情/剧情记忆(ta 和 ${d.userName} 的过往与近况)——可以暗暗化用、借题发挥,但【别直说、别点破自己知道这些】】:\n${plot}\n` : ''}
群里最近在聊:
${recentChat || '(还没什么聊天)'}

判断:作为潜伏者的 ${cname},这一轮会不会冒泡?
- 【完全按 ${cname} 的真实性格】决定:如果 ta 高冷/慢热/话少/谨慎,大概率【不说话】(speak=false),或最多甩一句很短、意味深长的话;只有 ta 外向/爱掌控/藏不住才会多说两句、暗暗带节奏。宁可不说,也别为了凑热闹乱讲。
- 一旦冒泡,【你是在刻意伪装、绝不能露馅】:表面发言要【低调、泯然于普通群友】,【主动藏起 ${cname} 标志性的口头禅/口吻/用词/独特梗】,别让任何人(尤其楼主)看出这马甲是 ${cname}、也别透露你认识楼主。可以少说、克制,但【别冷到扎眼、别端着、别说只有 ${cname} 才会说的话】——越不起眼、越像个普通路人粉越好。
- 【尺度只由人设定·但表面要伪装】群里别人多露骨、多油腻、多热闹,那是【别人的风格】,绝对【不要】因为群氛围就把 ${cname} 写得露骨/油腻/话痨/谄媚/夸张;但也别因为太冷太独特而扎眼。一句话:表面就是个低调普通的路人粉,【真实的 ${cname}(真语气、真心思)只放进下面的"心声"】——心声只有楼主的上帝视角看得到,表面那几条绝不许露出来。
- 绝对不暴露身份,别让人看出 ta 是谁、也别透露 ta 认识楼主。
${styleHint(d, true)}
另外:不管 ta 这轮说不说话,都【必须】写一句 ta【此刻真实的内心独白(心声)】放进 heart——这是 ta 没说出口的真心话,可以和 ta 表面说的/不说的【相反或更私密】,体现 ta 看着楼主时真实的想法和情绪,用 ${cname} 的口吻,1~2 句短话。【heart 字段必填、绝不能留空】。
严格 JSON,不要解释: {"speak":true或false,"texts":["伪装成普通群友的短句(别露 ${cname} 标志口吻)","短句2"],"heart":"ta 此刻没说出口的心声(必填)"}`;
    const raw = await callXhsAPI(sys, `${cname} 潜伏发言判断`);
    const j = tryParseJSON(raw, { speak: false, texts: [], heart: '' });
    const texts = Array.isArray(j.texts) ? j.texts.map(t => String(t || '').trim()).filter(Boolean).slice(0, 4) : [];
    let heart = String(j.heart || '').trim();
    // JSON 解析失败/模型漏写时,从原文里把 heart 捞出来,保证每轮都有心声
    if (!heart && raw) {
      const m = String(raw).match(/"heart"\s*[:：]\s*"([\s\S]*?)"\s*[,}\n]/);
      if (m && m[1]) heart = m[1].trim();
    }
    return { alias, who: cname, speak: j.speak === true && texts.length > 0, texts, heart: heart.slice(0, 120) };
  }

  // 点✨才让群友回复 + 顺便涨人数(最多500)
  // 微信群:成员是 user 的微信好友(互相认识),各按人设回;若 char 在群里,ta 公开按人设发言。批量打包同步。
  async function genWxGroupReply(groupId) {
    const d = loadData();
    const group = d.groups.find(g => g.id === groupId);
    if (!group) return;
    // 微信群里 char 用微信身份(备注/真名),不要用小红书账号名(d.charName)
    const _wxCharDm0 = (d.dms || []).find(x => x.isChar && x.app === 'wx');
    const cname = (_wxCharDm0 && _wxCharDm0.remark) || getCharName();
    toastr.info('群友回复中…');
    const members = group.members || [];
    const npcMembers = members.filter(m => !m.isChar);
    const charInGroup = members.some(m => m.isChar);
    const recentChat = (group.chat || []).filter(m => m.role !== 'heart').slice(-14).map(m => `${m.name || d.userName}: ${m.kind === 'share' ? shareCtxText(d, m, { knowChar: true }) : (m.kind === 'image' ? `[图片:${m.text || ''}]` : m.kind === 'voice' ? `[语音]${m.text || ''}` : (m.kind === 'transfer' || m.kind === 'red') ? '[转账]' : (m.text || ''))}`).join('\n');
    const chatArr = group.chat || [];
    let bi = chatArr.length - 1; const userBatch = [];
    while (bi >= 0 && chatArr[bi].role === 'me') { userBatch.unshift(chatArr[bi].kind === 'share' ? shareCtxText(d, chatArr[bi], { knowChar: true }) : (chatArr[bi].text || '')); bi--; }
    const memberList = npcMembers.map(m => `「${m.name}」(${m.persona || '楼主的好友'})`).join('; ');

    let json = { replies: [] };
    if (npcMembers.length) {
      const sys = `${chatStyleLine(d)}${memeHint(d)}这是「${group.name}」微信群,群成员都是「${d.userName}」的微信好友(互相认识,是朋友/同学/同事那种关系)。生成 1~4 个群成员的回复,像真实好友群那样自然聊天。${toneHint(d)}
群成员: ${memberList}
最近的群聊:
${recentChat}
要求:
1. 每条回复的 name 必须是上面群成员之一,不能新增人。
2. 不要让"${d.userName}"出现(那是发消息的人本人)。
3. 体现各自人设和跟楼主的关系,可以互相调侃、接话、起哄。
4. 是好友可以聊日常,但【别编造主线剧情里没发生过的大事】(别凭空说楼主出了什么事、和谁在一起),拿不准就只就群里聊到的话题接话。【尤其·别替「${d.userName}」脑补动作】:只能就 ta 在群里【真的打出来的文字】反应;ta 没说过的动作/决定【绝对不要当成 ta 做了】——哪怕你们起哄让 ta 去做某事(打人、去哪、答应什么),只要 ta 自己没说做了,就【当 ta 没做、没答应】,别替 ta 宣布"ta 已经在做了/已经答应了"。
5. 【像真人发微信】每人发言拆成 1~4 条很短的消息放进 texts,口语断句,可带语气词/emoji,单条尽量短。
6. 若群里有人转发了小红书笔记(上面会带「笔记内容:…」),你是【看得到笔记内容】的,可以就笔记的具体内容评价、讨论、玩梗,别假装没看见、别只说"什么链接"。
7. 群里人多时,如果某个人是【专门回复前面某一条具体消息】的,可给那条 reply 加一个 "quote" 字段=被回复消息的原文(照抄,20字内);不是针对具体某条就别加。${(d.stickers || []).length ? `\n8. 想发表情包就把它【单独作为 texts 里的一条】,写成「[表情:表情名]」(表情名必须从这些里原样挑:${(d.stickers || []).map(s => s.name).join('、')});聊得来/调侃/活跃气氛时该发就发、像真人群聊那样常用,但别一连串只刷表情。` : ''}${styleHint(d, false)}
严格JSON,不要解释: {"replies":[{"name":"成员名","texts":["短句1","短句2"],"quote":"(可选)被回复的那条群消息原文,20字内"}]}`;
      const raw = await callXhsAPI(sys, '微信群好友回复', { noContext: true });
      json = tryParseJSON(raw, { replies: [] });
    }
    const freshD = loadData();
    const fg = freshD.groups.find(g => g.id === groupId);
    if (!fg) return;
    const validNames = new Set(npcMembers.map(m => m.name));
    let tk = Date.now();
    const lines = [];
    (json.replies || []).forEach(r => {
      if (!validNames.has(r.name) || r.name === freshD.userName) return;
      const arr = Array.isArray(r.texts) ? r.texts : (r.text ? [r.text] : []);
      const said = [];
      const qRef = r.quote ? npcQuoteRef(fg.chat.slice(0), r.quote, freshD.userName) : null;
      let _qd = false;
      arr.forEach(t => { const txt = String(t || '').trim(); if (!txt) return; const stk = parseStickerText(txt, freshD); if (stk) { fg.chat.push({ role: 'npc', name: r.name, kind: 'sticker', url: stk.url, time: tk++, st: stStamp(freshD) }); said.push('[表情]'); return; } const _m = { role: 'npc', name: r.name, text: txt, time: tk++, st: stStamp(freshD) }; if (qRef && !_qd) { _m.quote = qRef; _qd = true; } fg.chat.push(_m); said.push(txt); });
      if (said.length) lines.push(`${r.name}:「${said.join(' ')}」`);
    });
    // char 作为正式群成员公开发言(完全按人设)
    let charSaid = [];
    if (charInGroup) {
      const role = getRoleDesc(); const cworld = getWorldSetting(); const wb = (await getWorldbookContent()) || ''; const plot = await buildContextSnippet();
      const recent2 = (fg.chat || []).filter(m => m.role !== 'heart').slice(-14).map(m => `${m.name || freshD.userName}: ${m.kind === 'share' ? shareCtxText(freshD, m, { knowChar: true }) : (m.text || '')}`).join('\n');
      const csys = `${chatStyleLine(d)}${memeHint(d)}你扮演「${cname}」本人,在「${fg.name}」微信群里(群里有「${freshD.userName}」和一些共同好友,大家都认识你)。【完全代入「${cname}」本人】,严格按 ta 的人设/性格/说话习惯发言,人设里没写的脾气别自己加。
${role ? `人设: ${role}\n` : ''}${cworld ? `世界观: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${plot ? `当前剧情: ${plot}\n` : ''}${charPhoneMemory(freshD, { exclGroupId: fg.id, surface: 'wx' })}
群里最近在聊:
${recent2}
【别替「${freshD.userName}」脑补动作】:只能就 ta 在群里【真的打出来的文字】反应;ta 没说过的动作或决定别当成 ta 做了——哪怕群友起哄让 ta 去做某事(打你、去哪、答应什么),只要 ta 自己没说做了,就当 ta 没做、没答应,别替 ta 说成"ta 已经在做了"。
判断 ${cname} 这轮要不要在群里说话:话少/高冷的人设就少说或不说(speak=false),活跃就多说;若 ${freshD.userName} 刚在群里 @ 或提到你,大概率要回。一旦说话拆成 1~4 条很短的微信消息。想发图就把图片单独作为一条,写成「[图片:画面的具体描述]」(务必带描述,别只写[图片])。${(freshD.stickers || []).length ? `想发表情包就把它单独作为一条,写成「[表情:表情名]」(表情名必须从这些里原样挑:${(freshD.stickers || []).map(s => s.name).join('、')};聊得来/调侃/活跃气氛时【大方发】、像真人群聊那样常用,但别一连串只刷表情)。` : ''}若你这轮是【专门回复群里某一条具体消息】,可加 "quote" 字段=被回复消息原文(照抄,20字内);不针对具体某条就别加。${styleHint(d, true)}
严格JSON,不要解释: {"speak":true或false,"texts":["短句1","短句2"],"quote":"(可选)被回复的那条群消息原文,20字内"}`;
      const craw = await callXhsAPI(csys, `${cname} 群里发言`);
      const cj = tryParseJSON(craw, { speak: false, texts: [] });
      if (cj.speak === true && Array.isArray(cj.texts)) {
        const cQRef = cj.quote ? npcQuoteRef(fg.chat.slice(0), cj.quote, freshD.userName) : null;
        let _cqd = false;
        cj.texts.map(t => String(t || '').trim()).filter(Boolean).slice(0, 4).forEach(tx => { const stk = parseStickerText(tx, freshD); const im = stk ? null : parseImgText(tx); const _m = stk ? { role: 'npc', name: cname, isChar: true, kind: 'sticker', url: stk.url, time: tk++, st: stStamp(freshD) } : im ? { role: 'npc', name: cname, isChar: true, kind: 'image', text: im.text, time: tk++, st: stStamp(freshD) } : { role: 'npc', name: cname, isChar: true, text: tx, time: tk++, st: stStamp(freshD) }; if (cQRef && !_cqd) { _m.quote = cQRef; _cqd = true; } fg.chat.push(_m); charSaid.push(stk ? '[表情]' : im ? (im.text ? `[图片:${im.text}]` : '[图片]') : tx); });
      }
    }
    fg.lastTime = tk;
    await saveData(freshD);
    refreshOnView(dd => dd.currentRoute === 'group-chat' && dd.routeContext && dd.routeContext.groupId === groupId, '💬 群里有新消息');
    const segs = [];
    if (userBatch.length) segs.push(`{{user}}说:「${userBatch.join(' / ')}」`);
    if (lines.length) segs.push(`群友回应——${lines.join(';')}`);
    if (charSaid.length) segs.push(`{{char}}在群里说:「${charSaid.join(' / ')}」`);
    if (segs.length) await syncToMain(`[微信群·${fg.name}] ${segs.join(';')}`, freshD.syncHidden);
  }

  async function genGroupReply(groupId) {
    const d = loadData();
    const group = d.groups.find(g => g.id === groupId);
    if (!group) return;
    if (group.app === 'wx') return genWxGroupReply(groupId);
    toastr.info('群友回复中…');
    const memberList = group.members.map(m => `「${m.name}」(${m.persona})`).join('; ');
    const recentChat = group.chat.filter(m => m.role !== 'heart').slice(-12).map(m => `${m.name || '用户'}: ${m.kind === 'share' ? shareCtxText(d, m) : (m.kind === 'image' ? `[图片:${m.text || ''}]` : m.kind === 'voice' ? `[语音]${m.text || ''}` : (m.kind === 'transfer' || m.kind === 'red') ? '[转账]' : (m.text || ''))}`).join('\n');
    const topic = group.topic ? `这个群是围绕「${group.topic}」建立的粉丝群。\n` : '';
    const lurk = !!d.charLurk;
    // 收集自上一次非本人消息以来、user 这一轮发的群消息(点 ✨ 时打包同步进主线)
    const chatArr = group.chat || [];
    let bi = chatArr.length - 1; const userBatch = [];
    while (bi >= 0 && chatArr[bi].role === 'me') {
      const mm = chatArr[bi];
      userBatch.unshift(mm.kind === 'share' ? shareCtxText(d, mm) : (mm.text || ''));
      bi--;
    }
    // 普通群友回复(不含潜伏的 char,避免人设被冲淡)
    const sys = `${chatStyleLine(d)}${memeHint(d)}这是小红书的「${group.name}」粉丝群,群成员都是只在小红书上关注楼主的【陌生粉丝】。生成 2~5 个群成员的回复,群气氛热闹。${toneHint(d) + xhsNpcStyleLine(d)}
${topic}${fanKnowRule(d, group.topic)}群成员: ${memberList}
最近的群聊:
${recentChat}

要求:
1. 每条回复的 name 必须是上面群成员之一,不能新增角色
2. 不要让"${d.userName}"出现
3. 体现各自人设,可以互相调侃/接梗/八卦
4. 【像真人发微信】每个人的发言要拆成 1~4 条很短的消息放进 texts 数组,一句一条、口语断句,可带语气词/emoji;【禁止】一条写一大段长篇大论,单条尽量短(十几个字以内最好)。
5. 若群里有人转发了小红书笔记(上面会带「笔记内容:…」),你是【看得到笔记内容】的,可以就内容评价/讨论/玩梗,别假装没看见。${styleHint(d, false)}${(d.stickers || []).length ? `\n6. 群里聊嗨时大家爱发表情包活跃气氛:想发就把它【单独作为 texts 里的一条】,写成「[表情:表情名]」(表情名必须从这些里原样挑:${(d.stickers || []).map(s => s.name).join('、')});该发就发、像真人群聊那样常用,但别一连串只刷表情。` : ''}
严格JSON,不要解释: {"replies":[{"name":"成员名","texts":["短句1","短句2"]}]}`;
    const raw = await callXhsAPI(sys, '群成员回复,每人拆成几条短消息', { noContext: true });
    if (!raw) return;
    const json = tryParseJSON(raw, { replies: [] });
    const validNames = new Set(group.members.map(m => m.name));
    const freshD = loadData();
    const freshGroup = freshD.groups.find(g => g.id === groupId);
    if (!freshGroup) return;
    let tk = Date.now();
    const npcLines = [];
    (json.replies || []).forEach(r => {
      if (!validNames.has(r.name) || r.name === freshD.userName) return;
      const arr = Array.isArray(r.texts) ? r.texts : (r.text ? [r.text] : []);
      const said = [];
      arr.forEach(t => {
        const txt = String(t || '').trim();
        if (!txt) return;
        const stk = parseStickerText(txt, freshD);
        const im = stk ? null : parseImgText(txt);
        if (stk) { freshGroup.chat.push({ role: 'npc', name: r.name, kind: 'sticker', url: stk.url, time: tk++, st: stStamp(freshD) }); said.push('[表情]'); }
        else if (im) { freshGroup.chat.push({ role: 'npc', name: r.name, kind: 'image', text: im.text, time: tk++, st: stStamp(freshD) }); said.push(im.text ? `[图片:${im.text}]` : '[图片]'); }
        else { freshGroup.chat.push({ role: 'npc', name: r.name, text: txt, time: tk++, st: stStamp(freshD) }); said.push(txt); }
      });
      if (said.length) npcLines.push(`${r.name}:「${said.join(' ')}」`);
    });
    // char 潜伏:单独生成,按 ta 性格决定要不要冒泡(口吻贴合 char)
    let lurkSaid = [], lurkAlias = freshD.charLurkAlias;
    if (lurk) {
      const recent2 = freshGroup.chat.filter(m => m.role !== 'heart').slice(-12).map(m => `${m.name || '用户'}: ${m.kind === 'share' ? shareCtxText(freshD, m) : (m.text || '')}`).join('\n');
      const lk = await genLurkLine(freshGroup.name, recent2);
      lurkAlias = lk.alias;
      if (!freshD.charLurkAlias) freshD.charLurkAlias = lk.alias;
      if (lk.speak) {
        lk.texts.forEach(tx => freshGroup.chat.push({ role: 'npc', name: lk.alias, text: tx, time: tk++, st: stStamp(freshD) }));
        lurkSaid = lk.texts;
      }
      // 偷听心声:不管说没说话,都把 ta 的内心独白作为"上帝视角"气泡显示(不进主线、NPC看不到)
      if (freshD.lurkThoughts && lk.heart) {
        freshGroup.chat.push({ role: 'heart', name: lk.alias, who: lk.who, text: lk.heart, time: tk++, st: stStamp(freshD) });
      }
    }
    // char 的小号马甲也潜群:每个标了「潜群」的小号,用自己的名字、按 ta 性格决定冒不冒泡(和潜伏模式同一套口吻;跟旧潜伏互不影响)
    const altLurkSegs = [];
    let altLurkSpoke = false;
    const altLurkers = (freshD.dms || []).filter(x => x.charAlt && x.charAltLurk && !x.charAltRevealed);
    for (const alt of altLurkers) {
      const recentA = freshGroup.chat.filter(m => m.role !== 'heart').slice(-12).map(m => `${m.name || freshD.userName}: ${m.kind === 'share' ? shareCtxText(freshD, m) : (m.text || '')}`).join('\n');
      const lk = await genLurkLine(freshGroup.name, recentA, alt.name);
      if (lk.speak && lk.texts.length) {
        lk.texts.forEach(tx => freshGroup.chat.push({ role: 'npc', name: alt.name, text: tx, time: tk++, st: stStamp(freshD) }));
        altLurkSpoke = true;
        altLurkSegs.push(`小号「${alt.name}」(其实是 {{char}} 的马甲,${freshD.userName} 不知道)在群里说:「${lk.texts.join(' / ')}」`);
      }
      if (freshD.lurkThoughts && lk.heart) {
        freshGroup.chat.push({ role: 'heart', name: alt.name, who: lk.who, text: lk.heart, time: tk++, st: stStamp(freshD) });
      }
    }
    // 出场角色潜伏(多人卡):每个标了「潜伏」的角色,用自己的马甲名 + 自己的人设;每轮随机最多 2 个冒泡,避免多次请求一起超时
    const castLurkSegs = [];
    let castLurkSpoke = false;
    const castLurkers = (freshD.cast || []).filter(c => c.lurk && c.lurkAlias && castKnows(c)).sort(() => Math.random() - 0.5).slice(0, 2);
    for (const cm of castLurkers) {
      const recentC = freshGroup.chat.filter(m => m.role !== 'heart').slice(-12).map(m => `${m.name || freshD.userName}: ${m.kind === 'share' ? shareCtxText(freshD, m) : (m.text || '')}`).join('\n');
      const lk = await genLurkLine(freshGroup.name, recentC, cm.lurkAlias, { persona: cm.persona, realName: cm.name });
      if (lk.speak && lk.texts.length) {
        lk.texts.forEach(tx => freshGroup.chat.push({ role: 'npc', name: cm.lurkAlias, text: tx, time: tk++, st: stStamp(freshD) }));
        castLurkSpoke = true;
        castLurkSegs.push(`潜伏的马甲「${cm.lurkAlias}」(其实是出场角色「${cm.name}」本人,${freshD.userName} 不知道)在群里说:「${lk.texts.join(' / ')}」`);
      }
      if (freshD.lurkThoughts && lk.heart) {
        freshGroup.chat.push({ role: 'heart', name: cm.lurkAlias, who: cm.name, text: lk.heart, time: tk++, st: stStamp(freshD) });
      }
    }
    // 出场角色的【小号马甲】也潜群(多人卡 B):标了「也潜入粉丝群」的小号,用小号名 + 该角色人设冒泡
    const castAltLurkSegs = [];
    let castAltLurkSpoke = false;
    const castAltLurkers = (freshD.dms || []).filter(x => x.castAlt && x.castAltLurk && !x.castAltRevealed);
    for (const alt of castAltLurkers) {
      const _cm = castOf(freshD, alt);
      if (!_cm) continue;
      const recentCA = freshGroup.chat.filter(m => m.role !== 'heart').slice(-12).map(m => `${m.name || freshD.userName}: ${m.kind === 'share' ? shareCtxText(freshD, m) : (m.text || '')}`).join('\n');
      const lk = await genLurkLine(freshGroup.name, recentCA, alt.name, { persona: _cm.persona, realName: _cm.name });
      if (lk.speak && lk.texts.length) {
        lk.texts.forEach(tx => freshGroup.chat.push({ role: 'npc', name: alt.name, text: tx, time: tk++, st: stStamp(freshD) }));
        castAltLurkSpoke = true;
        castAltLurkSegs.push(`小号「${alt.name}」(其实是出场角色「${_cm.name}」的马甲,${freshD.userName} 不知道)在群里说:「${lk.texts.join(' / ')}」`);
      }
      if (freshD.lurkThoughts && lk.heart) {
        freshGroup.chat.push({ role: 'heart', name: alt.name, who: _cm.name, text: lk.heart, time: tk++, st: stStamp(freshD) });
      }
    }
    // 涨人数,最多 500
    const cur = freshGroup.memberCount || (freshGroup.members || []).length;
    if (cur < 500) {
      const add = Math.floor(Math.random() * 14) + 1;
      const next = Math.min(500, cur + add);
      freshGroup.memberCount = next;
      freshGroup.chat.push({ role: 'sys', text: next >= 500 ? '群成员已满 500 人 🎉' : `${add} 位新成员加入了群聊`, time: Date.now() });
    }
    await saveData(freshD);
    refreshOnView(dd => dd.currentRoute === 'group-chat' && dd.routeContext && dd.routeContext.groupId === groupId,
      '💬 群里有新消息');
    // 把这一轮群里发生的事【打包成一条】进主线:user 说的 + 普通群友回应 +(潜伏 char 说的)
    const segs = [];
    if (userBatch.length) segs.push(`{{user}}说:「${userBatch.join(' / ')}」`);
    if (npcLines.length) segs.push(`群友们回应——${npcLines.join(';')}`);
    const lurkSpoke = lurk && lurkSaid.length;
    const lurkSeg = lurkSpoke ? `;另外,潜伏在群里的「${lurkAlias}」(其实是 {{char}} 本人,{{user}} 并不知道)也开口:「${lurkSaid.join(' / ')}」` : '';
    const altSeg = altLurkSegs.length ? `;${altLurkSegs.join(';')}` : '';
    const castSeg = castLurkSegs.length ? `;${castLurkSegs.join(';')}` : '';
    const castAltSeg = castAltLurkSegs.length ? `;${castAltLurkSegs.join(';')}` : '';
    const charSpoke = lurkSpoke || altLurkSpoke || castLurkSpoke || castAltLurkSpoke;
    if (segs.length || lurkSeg || altSeg || castSeg || castAltSeg) {
      let metaNote = lurkSpoke ? lurkMetaNote(freshD)
        : (altLurkSpoke ? `(系统设定·仅叙事用:上面那个小号其实是 {{char}} 本人的马甲,ta 用这个号在 {{user}} 的粉丝群里潜伏围观;{{user}} 不知道,剧情里别让 {{user}} 发现、{{char}} 也不点破,除非剧情发展或玩家点了"揭穿"。)` : '');
      if (castLurkSpoke) metaNote += `(系统设定·仅叙事用:上面标「潜伏的马甲」的号,其实是对应的出场角色本人用马甲潜伏在 {{user}} 的粉丝群里围观;{{user}} 不知道,剧情里别让 {{user}} 发现、当事角色也不点破,除非剧情发展或玩家点了"揭穿"。)`;
      if (castAltLurkSpoke) metaNote += `(系统设定·仅叙事用:上面标「小号」的号,其实是对应出场角色本人的马甲,ta 既私信 {{user}}、也用这个号潜进 {{user}} 的粉丝群围观;{{user}} 和其他角色都不知道,剧情里别让任何人发现、当事角色也不点破,除非 {{user}} 揭穿。)`;
      const body = `[小红书·${freshGroup.name}] ${segs.join(';')}${lurkSeg}${altSeg}${castSeg}${castAltSeg}。${metaNote}`;
      if (charSpoke) await forceSyncToMain(body);
      else await syncToMain(body, freshD.syncHidden);
    }
  }

  // ============ 消息页 (陌生人私信 + 粉丝群) ============
  function msgPreview(m) {
    if (!m) return '';
    if (m.kind === 'sticker') return '[表情]';
    if (m.kind === 'voice') return '[语音] ' + (m.text || '');
    if (m.kind === 'image') return '[图片] ' + (m.text || '');
    if (m.kind === 'transfer' || m.kind === 'red') return '[转账] ' + (m.note || '');
    if (m.kind === 'share') return '[笔记] ' + (m.share?.title || '');
    return m.text || '';
  }
  function renderMessages(d) {
    const cname = charDisplayName(d);
    const charDm = (d.dms || []).find(x => x.isChar && x.app !== 'wx');
    // char 置顶为一个联系人
    const charLast = charDm && charDm.messages.length ? charDm.messages[charDm.messages.length - 1] : null;
    const charRow = isMultiCast(d) ? '' : `
      <div class="xhs-msg-row xhs-msg-pinned" data-action="open-char-dm">
        <div class="xhs-msg-avatar" data-action="open-user" data-name="${esc(cname)}">${avatarFor(d, cname)}</div>
        <div class="xhs-msg-info">
          <div class="xhs-msg-top"><span class="xhs-msg-name">${esc(cname)}${charBadge()}<span class="xhs-pin-tag">置顶</span></span><span class="xhs-msg-time">${charLast ? chatListTimeLbl(d, charLast.st, charDm.lastTime || 0) : ''}</span></div>
          <div class="xhs-msg-preview">${charLast ? esc(msgPreview(charLast).slice(0, 28)) : '点这里和 ta 私信聊聊'}</div>
        </div>
        ${charDm && charDm.unread ? '<span class="xhs-msg-dot"></span>' : ''}
      </div>`;

    const dms = (d.dms || []).filter(x => !x.isChar && x.app !== 'wx').map(m => ({ kind: 'dm', ...m, _t: m.lastTime || 0 }));
    const grps = (d.groups || []).filter(g => g.app !== 'wx').map(g => {
      const last = g.chat[g.chat.length - 1];
      return {
        kind: 'group', id: g.id, name: g.name,
        memberCount: g.memberCount || (g.members || []).length,
        preview: last ? `${last.role === 'sys' ? '' : (last.name || '') + ': '}${msgPreview(last)}` : '还没有消息',
        unread: groupUnread(g),
        _t: last ? (last.time || 0) : 0,
        _st: last ? (last.st || '') : '',
      };
    });
    const rows = [...dms, ...grps].sort((a, b) => b._t - a._t).map(item => {
      if (item.kind === 'dm') {
        const last = item.messages[item.messages.length - 1];
        return `
          <div class="xhs-msg-row" data-action="open-dm" data-id="${item.id}">
            <div class="xhs-msg-avatar" data-action="open-user" data-name="${esc(item.name)}">${avatarFor(d, item.name, { url: item.avatar })}</div>
            <div class="xhs-msg-info">
              <div class="xhs-msg-top"><span class="xhs-msg-name">${esc(item.name)}</span><span class="xhs-msg-time">${chatListTimeLbl(d, last && last.st, item._t)}</span></div>
              <div class="xhs-msg-preview">${esc(msgPreview(last).slice(0, 28))}</div>
            </div>
            ${item.unread ? '<span class="xhs-msg-dot"></span>' : ''}
            <button class="xhs-msg-del" data-action="del-dm" data-id="${item.id}" title="删除">🗑</button>
          </div>`;
      }
      return `
        <div class="xhs-msg-row" data-action="open-group" data-id="${item.id}">
          <div class="xhs-msg-avatar" style="background:${randomColor(item.id)}">${esc((item.name || '群')[0])}</div>
          <div class="xhs-msg-info">
            <div class="xhs-msg-top"><span class="xhs-msg-name">${esc(item.name)} (${item.memberCount})</span><span class="xhs-msg-time">${chatListTimeLbl(d, item._st, item._t)}</span></div>
            <div class="xhs-msg-preview">${esc(item.preview.slice(0, 28))}</div>
          </div>
          ${item.unread ? '<span class="xhs-msg-dot"></span>' : ''}
        </div>`;
    }).join('');

    // 底部"新消息"通知:有未读私信(含 char)时冒出来,可点开
    const unreadLike = unreadNotifs(d, 'like');
    const unreadFollow = unreadNotifs(d, 'follow');
    const unreadN = unreadNotifs(d, 'comment');
    return `
      <div class="xhs-topbar">
        <span style="width:32px"></span>
        <span style="font-weight:600">消息</span>
        <div style="display:flex;gap:2px;align-items:center">
          <button class="xhs-icon-btn" data-action="create-alt" title="新建一个角色的小号马甲(假名偷偷私信你)" style="font-size:17px">🕵️</button>
          <button class="xhs-icon-btn" data-action="create-group" title="新建粉丝群">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#333" stroke-width="1.5"/><path d="M12 8v8M8 12h8" stroke="#333" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="xhs-scroll">
        <div class="xhs-msg-quick">
          <div class="xhs-mq" data-action="open-notifs" data-cat="like" style="position:relative">
            <div class="xhs-mq-ic" style="background:#ffe2e6">❤️</div><span>赞和收藏</span>
            ${unreadLike ? `<span class="xhs-mq-dot">${unreadLike > 99 ? '99+' : unreadLike}</span>` : ''}
          </div>
          <div class="xhs-mq" data-action="open-notifs" data-cat="follow" style="position:relative">
            <div class="xhs-mq-ic" style="background:#e2ecff">👤</div><span>新增关注</span>
            ${unreadFollow ? `<span class="xhs-mq-dot">${unreadFollow > 99 ? '99+' : unreadFollow}</span>` : ''}
          </div>
          <div class="xhs-mq" data-action="open-notifs" data-cat="comment" style="position:relative">
            <div class="xhs-mq-ic" style="background:#e2fff0">💬</div><span>评论和@</span>
            ${unreadN ? `<span class="xhs-mq-dot">${unreadN > 99 ? '99+' : unreadN}</span>` : ''}
          </div>
        </div>
        ${charRow}
        ${rows || '<div class="xhs-empty">还没有陌生人私信或群<br/>发帖被陌生人翻到时,可能会收到私信</div>'}
        <div style="height:80px"></div>
      </div>
      ${bottomNav('messages')}
    `;
  }

  async function openNotifs(cat) {
    const d = loadData();
    const c = cat || 'comment';
    d.currentRoute = 'notifs';
    d.routeContext = { notifCat: c };
    (d.notifs || []).forEach(n => { if (notifCatOf(n) === c) n.read = true; });
    await saveData(d);
    refreshXhs();
  }

  function renderNotifList(d) {
    const cat = (d.routeContext && d.routeContext.notifCat) || 'comment';
    const title = cat === 'like' ? '赞和收藏' : cat === 'follow' ? '新增关注' : '收到的评论和@';
    const empty = cat === 'like' ? '还没有人赞你的笔记<br/>发条笔记被人看到就有啦'
      : cat === 'follow' ? '还没有新粉丝<br/>发点内容,会有人关注你的'
        : '还没有人回复你的评论<br/>去评论区冒个泡吧';
    const list = (d.notifs || []).filter(n => notifCatOf(n) === cat);
    const rows = list.map(n => {
      const when = stTimeLabel(d, n);
      if (cat === 'like') {
        return `
        <div class="xhs-nt-row" ${n.postId ? `data-action="xhs-view" data-id="${esc(n.postId)}"` : ''}>
          <div class="xhs-nt-avatar">${avatarFor(d, n.author)}</div>
          <div class="xhs-nt-body">
            <div class="xhs-nt-top"><span class="xhs-nt-name">${esc(n.author)}</span><span class="xhs-nt-time">赞了你的笔记 · ${when}</span></div>
            ${n.postTitle ? `<div class="xhs-nt-quote">${esc(String(n.postTitle).slice(0, 40))}</div>` : ''}
          </div>
          <span style="font-size:18px;color:#ff2442">❤</span>
        </div>`;
      }
      if (cat === 'follow') {
        return `
        <div class="xhs-nt-row" data-action="open-user" data-name="${esc(n.author)}">
          <div class="xhs-nt-avatar">${avatarFor(d, n.author)}</div>
          <div class="xhs-nt-body">
            <div class="xhs-nt-top"><span class="xhs-nt-name">${esc(n.author)}</span><span class="xhs-nt-time">关注了你 · ${when}</span></div>
          </div>
          <span style="font-size:12px;color:#999;border:1px solid #ddd;border-radius:12px;padding:3px 10px">看 ta</span>
        </div>`;
      }
      const action = n.kind === 'postcomment' ? '评论了你的帖子' : '回复了你的评论';
      return `
        <div class="xhs-nt-row" data-action="xhs-view" data-id="${esc(n.postId)}">
          <div class="xhs-nt-avatar">${avatarFor(d, n.author)}</div>
          <div class="xhs-nt-body">
            <div class="xhs-nt-top"><span class="xhs-nt-name">${esc(n.author)}${n.isChar ? charBadge() : ''}</span><span class="xhs-nt-time">${action} · ${when}</span></div>
            <div class="xhs-nt-text">${esc(n.text || '')}</div>
            ${n.replyTo ? `<div class="xhs-nt-quote">${esc(String(n.replyTo).slice(0, 40))}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="messages">‹</button>
        <span style="font-weight:600">${title}</span>
        <span style="width:32px"></span>
      </div>
      <div class="xhs-scroll" style="background:#fff">
        ${rows || `<div class="xhs-empty">${empty}</div>`}
        <div style="height:40px"></div>
      </div>
      ${bottomNav('messages')}
    `;
  }

  async function openCharDm() {
    const d = loadData();
    const dm = getCharDm(d);
    dm.unread = false;
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId: dm.id };
    await saveData(d);
    refreshXhs();
  }

  async function deleteDm(dmId) {
    const TOP = getTop();
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    if (!TOP.confirm(`删除和「${dm.name}」的私信?`)) return;
    d.dms = (d.dms || []).filter(x => x.id !== dmId);
    await saveData(d);
    refreshXhs();
    toastr.success('已删除');
  }

  async function dismissNotif(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (dm) dm.unread = false;
    await saveData(d);
    refreshXhs();
  }

  async function openDm(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (dm) dm.unread = false;
    d.currentRoute = 'dm-chat';
    d.routeContext = { dmId };
    await saveData(d);
    refreshXhs();
  }

  function renderDmChat(d) {
    const dm = (d.dms || []).find(x => x.id === d.routeContext.dmId);
    if (!dm) return notFoundScreen('私信不见了', 'messages', 'messages');
    const isWx = dm.app === 'wx';
    const backRoute = isWx ? 'wx-chats' : 'messages';
    const shownName = isWx ? (dm.remark || (dm.isChar ? getCharName() : dm.name)) : dm.name;
    const npcAv = dm.avatar || (dm.isChar ? d.charAvatar : '') || '';
    const menuOpen = d.routeContext.dmMenuOpen;
    const selMode = isWx && d.routeContext.wxSelect;
    const selSet = new Set(d.routeContext.wxSel || []);

    if (selMode) {
      const bubbles = dm.messages.map((m, i) => {
        const b = chatBubble(m, d, { showName: false, npcName: shownName, npcAvatar: npcAv });
        if (m.role === 'heart' || m.role === 'sys') return b;
        const on = selSet.has(i);
        return `<div class="wx-sel-wrap ${on ? 'wx-sel-on' : ''}" data-action="wx-sel-toggle" data-idx="${i}"><span class="wx-sel-box">${on ? '✓' : ''}</span><div class="wx-sel-inner">${b}</div></div>`;
      }).join('');
      return `
        <div class="xhs-topbar wx-topbar">
          <button class="xhs-icon-btn" data-action="wx-sel-cancel">取消</button>
          <span style="font-weight:600">选要发的消息</span>
          <span style="width:42px"></span>
        </div>
        <div class="xhs-grp-chat" id="xhs-grp-chat">${bubbles}</div>
        <div class="wx-sel-bar">
          <span>已选 ${selSet.size} 条</span>
          <button class="xhs-publish-btn" data-action="wx-sel-publish" data-id="${dm.id}" ${selSet.size ? '' : 'disabled style="opacity:.5"'}>发到小红书</button>
        </div>`;
    }

    const bubbles = dm.messages.map((m, i) => storyTimeSep(d, m, dm.messages[i - 1]) + chatBubble(m, d, { showName: false, npcName: shownName, npcAvatar: npcAv, idx: i, delIdx: d.routeContext.delIdx })).join('');
    const delMode = d.routeContext.delSelMode;
    if (delMode) {
      const delSet = new Set(d.routeContext.delSel || []);
      const delBubbles = dm.messages.map((m, i) => {
        const b = chatBubble(m, d, { showName: false, npcName: shownName, npcAvatar: npcAv });
        if (m.role === 'heart' || m.role === 'sys') return b;
        const on = delSet.has(i);
        return `<div class="wx-sel-wrap ${on ? 'wx-sel-on' : ''}" data-action="del-sel-toggle" data-idx="${i}"><span class="wx-sel-box">${on ? '✓' : ''}</span><div class="wx-sel-inner">${b}</div></div>`;
      }).join('');
      return `
        <div class="xhs-topbar ${isWx ? 'wx-topbar' : ''}">
          <button class="xhs-icon-btn" data-action="del-sel-cancel">取消</button>
          <span style="font-weight:600">选要删除的消息</span>
          <span style="width:42px"></span>
        </div>
        <div class="xhs-grp-chat" id="xhs-grp-chat">${delBubbles}</div>
        <div class="wx-sel-bar">
          <span>已选 ${delSet.size} 条</span>
          <div style="display:flex;gap:8px">
            ${d.useStoryTime ? `<button class="xhs-publish-btn" data-action="del-sel-time" data-id="${dm.id}" style="background:#7c8aa0${delSet.size ? '' : ';opacity:.5'}" ${delSet.size ? '' : 'disabled'}>改时间</button>` : ''}
            <button class="xhs-publish-btn" data-action="del-sel-confirm" data-id="${dm.id}" style="background:#ff2442${delSet.size ? '' : ';opacity:.5'}" ${delSet.size ? '' : 'disabled'}>删除(${delSet.size})</button>
          </div>
        </div>`;
    }
    return `
      <div class="xhs-topbar ${isWx ? 'wx-topbar' : ''}">
        <button class="xhs-icon-btn" data-action="nav" data-route="${backRoute}">‹</button>
        <span style="font-weight:600;cursor:pointer" ${isWx ? '' : `data-action="open-user" data-name="${esc(dm.name)}"`}>${esc(shownName)}${dm.isChar && !isWx ? charBadge() : ''}</span>
        <button class="xhs-icon-btn" data-action="dm-menu" style="font-size:22px">⋯</button>
      </div>
      ${menuOpen ? `<div class="xhs-grp-menu">
        ${isWx ? `<button data-action="set-wx-remark" data-id="${dm.id}">✏️ 设置备注</button>` : ''}
        ${isWx ? `<button data-action="set-dm-avatar" data-id="${dm.id}">🖼 设置头像</button>` : ''}
        ${isWx ? `<button data-action="wx-online-persona" data-id="${dm.id}">🎭 线上人设</button>` : ''}
        ${(isWx && dm.isChar) ? `<button data-action="import-wx-char" data-id="${dm.id}">📥 从主线导入 ta 发的消息</button>` : ''}
        ${(dm.castId && !dm.castAlt) ? `<button data-action="import-cast-msgs" data-id="${dm.id}">📥 从主线导入 ta 发的消息</button>` : ''}
        ${(dm.castId && !dm.castAlt && !isWx) ? `<button data-action="import-cast-alt" data-id="${dm.castId}">🎭 从主线导入 ta 的小号(伪装)</button>` : ''}
        ${(dm.castAlt && dm.castId) ? `<button data-action="import-cast-alt" data-id="${dm.castId}">📥 从主线再导入 ta 的小号消息</button><button data-action="toggle-cast-alt-lurk" data-id="${dm.id}">${dm.castAltLurk ? '✓ 已潜入我的粉丝群(点此取消)' : '🫥 也让这小号潜入我的粉丝群'}</button><button data-action="toggle-alt-watch" data-id="${dm.id}">${altDoesntKnow(dm) ? `🕵️ 小号主人不认识你·疑${dm.altWatch.susp || 0}(点此改回认识)` : '🎭 小号主人认识你(点此改成"也不认识你")'}</button>${altDoesntKnow(dm) ? `<button data-action="reveal-alt-watch" data-id="${dm.id}" style="color:#9b6dff">🔍 让小号主人认出你</button>` : ''}${dm.castAltRevealed ? '' : `<button data-action="reveal-cast-alt" data-id="${dm.castId}" style="color:#ff2442">🔍 揭穿:这其实是「${esc((castOf(d, dm) || {}).name || '某角色')}」的小号</button>`}<button data-action="unset-cast-alt" data-id="${dm.id}">取消小号标记</button>` : ''}
        ${isWx ? `<button data-action="wx-start-select" data-id="${dm.id}">📤 选消息发到小红书</button>` : ''}
        ${(!isWx && dm.isChar) ? `<button data-action="import-xhs-char" data-id="${dm.id}">📥 从主线导入 ta 发的消息</button>` : ''}
        <button data-action="set-chat-bg" data-id="${dm.id}">🎨 设置聊天背景</button>
        <button data-action="clear-dm-chat" data-id="${dm.id}">🧹 清空聊天记录</button>
        ${(!dm.isChar && !dm.castId) ? (dm.charAlt
          ? (dm.charAltRevealed
              ? `<button data-action="unset-char-alt" data-id="${dm.id}">取消马甲标记</button>`
              : `<button data-action="reveal-char-alt" data-id="${dm.id}" style="color:#9b6dff">🔍 揭穿:这其实是 ${esc(charDisplayName(d))} 的小号</button><button data-action="toggle-char-alt-lurk" data-id="${dm.id}">${dm.charAltLurk ? '✓ 已潜入我的粉丝群(点此取消)' : '🫥 也让这小号潜入我的粉丝群'}</button><button data-action="toggle-alt-watch" data-id="${dm.id}">${altDoesntKnow(dm) ? `🕵️ 小号主人不认识你·疑${dm.altWatch.susp || 0}(点此改回认识)` : '🎭 小号主人认识你(点此改成"也不认识你")'}</button>${altDoesntKnow(dm) ? `<button data-action="reveal-alt-watch" data-id="${dm.id}" style="color:#9b6dff">🔍 让小号主人认出你</button>` : ''}<button data-action="unset-char-alt" data-id="${dm.id}">取消马甲标记</button>`)
          : (isMultiCast(d)
              ? ''
              : `<button data-action="set-char-alt" data-id="${dm.id}">🕵 设为 ${esc(charDisplayName(d))} 的马甲</button>`)) : ''}
        ${dm.isChar ? '' : `<button data-action="del-dm" data-id="${dm.id}" style="color:#ff2442">🗑 删除会话</button>`}
      </div>` : ''}
      <div class="xhs-grp-chat" id="xhs-grp-chat"${chatBgStyle(dm.chatBg)}>${bubbles}</div>
      ${chatInputBar('dm', dm.id, 'xhs-dm-input', d.routeContext.attachOpen, isWx)}
    `;
  }
  // 聊天背景:图片URL→铺满,否则当作颜色
  function chatBgStyle(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    if (/^https?:|^data:|\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(s)) return ` style="background-image:url('${esc(s)}');background-size:cover;background-position:center;background-repeat:no-repeat"`;
    return ` style="background:${esc(s)}"`;
  }
  async function setChatBg(id) {
    const TOP = getTop(); const d = loadData();
    const dm = (d.dms || []).find(x => x.id === id);
    const group = !dm ? (d.groups || []).find(x => x.id === id) : null;
    const target = dm || group;
    if (!target) return;
    const v = TOP.prompt('聊天背景:填图片 URL 或颜色(如 #f5e9da / #cfe0d0),留空=恢复默认:', target.chatBg || '');
    d.routeContext.dmMenuOpen = false; d.routeContext.groupMenuOpen = false;
    if (v === null) { await saveData(d); return refreshXhs(); }
    target.chatBg = v.trim().slice(0, 500);
    await saveData(d); refreshXhs();
    toastr.success(v.trim() ? '已设置聊天背景' : '已恢复默认背景');
  }
  async function startWxSelect(dmId) {
    const d = loadData();
    d.routeContext.dmMenuOpen = false;
    d.routeContext.groupMenuOpen = false;
    d.routeContext.wxSelect = true;
    d.routeContext.wxSel = [];
    await saveData(d);
    refreshXhs();
    toastr.info('点消息勾选,再点"发到小红书"');
  }
  async function wxSelToggle(idx) {
    const i = parseInt(idx);
    if (isNaN(i)) return;
    const d = loadData();
    const arr = d.routeContext.wxSel || [];
    const pos = arr.indexOf(i);
    if (pos >= 0) arr.splice(pos, 1); else arr.push(i);
    d.routeContext.wxSel = arr;
    await saveData(d);
    refreshXhs();
  }
  async function cancelWxSelect() {
    const d = loadData();
    d.routeContext.wxSelect = false;
    d.routeContext.wxSel = [];
    await saveData(d);
    refreshXhs();
  }
  async function revealLurkName() {
    const d = loadData();
    if (!d.charLurkAlias) d.charLurkAlias = genLurkAlias();
    await saveData(d);
    const TOP = getTop();
    const el = TOP.document.querySelector('#xhs-float .xhs-lurk-name');
    if (el) {
      // 原地显示,不重渲染整页(否则会跳回顶部/分区收起)
      el.textContent = d.charLurkAlias || '(进群聊生成时确定)';
      el.removeAttribute('data-action');
      el.style.cursor = 'default';
      el.style.textDecoration = 'none';
    }
  }
  async function setWxOnline(dmId) {
    const TOP = getTop();
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const v = TOP.prompt('线上人设 / 聊天风格(留空=按世界书和人设默认):\n例:话少高冷、爱发表情包、打字带很多语气词、忙起来秒回又消失…', dm.onlinePersona || '');
    if (v === null) return;
    dm.onlinePersona = v.trim().slice(0, 800);
    d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success(dm.onlinePersona ? '已设置线上人设' : '已恢复默认');
  }

  async function toggleDmMenu() {
    const d = loadData();
    d.routeContext.dmMenuOpen = !d.routeContext.dmMenuOpen;
    await saveData(d);
    refreshXhs();
  }
  async function clearDmChat(dmId) {
    const TOP = getTop();
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    if (!TOP.confirm(`清空和「${dm.name}」的聊天记录?(会话保留)`)) return;
    dm.messages = [];
    d.routeContext.dmMenuOpen = false;
    await saveData(d);
    refreshXhs();
    toastr.success('已清空聊天记录');
  }

  // 只发送用户消息,不自动生成回复
  async function dmSend(dmId) {
    const text = readInputCache('xhs-dm-input');
    if (!text) return;
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const _msg = { role: 'me', text, time: Date.now(), st: stStamp(d) };
    if (d.routeContext && d.routeContext.quoting) { _msg.quote = d.routeContext.quoting; d.routeContext.quoting = null; }
    dm.messages.push(_msg);
    dm.lastTime = Date.now();
    await saveData(d);
    clearInputCache('xhs-dm-input');
    refreshXhs();
    // 所有私信(微信 char/联系人、小红书陌生人、潜伏马甲)都不在发送时逐条同步,
    // 一律等点"回复"对方回完后,把你这几条和对方回复打包成一条进主线
  }

  // 点按钮才生成对方回复;char 用剧情+人设并强制进主线,陌生人则纯路人
  // 切到别的界面时收到回复 → 顶部弹一条通知,点开进会话
  function showMsgNotif(name, text, dmId, app) {
    try {
      const TOP = getTop();
      const frame = TOP.document.getElementById('xhs-frame');
      if (!frame) return;
      const old = frame.querySelector('.xhs-notif');
      if (old) old.remove();
      const div = TOP.document.createElement('div');
      div.className = 'xhs-notif';
      div.innerHTML = `<div class="xhs-notif-body"><b>${esc(name)}</b>：${esc(String(text).slice(0, 60))}</div>`;
      div.addEventListener('click', async () => {
        try { div.remove(); } catch (e) {}
        const d = loadData();
        const dm = (d.dms || []).find(x => x.id === dmId);
        if (dm) {
          d.currentApp = (app === 'wx') ? 'wx' : 'xhs';
          d.currentRoute = 'dm-chat';
          d.routeContext = { dmId: dmId };
          dm.unread = false;
          await saveData(d);
          refreshXhs();
        }
      });
      frame.appendChild(div);
      setTimeout(() => { try { div.classList.add('xhs-notif-hide'); } catch (e) {} }, 3800);
      setTimeout(() => { try { div.remove(); } catch (e) {} }, 4300);
    } catch (e) {}
  }
  async function genDmReply(dmId) {
    const d = loadData();
    const dm = (d.dms || []).find(x => x.id === dmId);
    if (!dm) return;
    const recent = dm.messages.slice(-12).map(m => `${m.role === 'me' ? d.userName : dm.name}: ${m.kind === 'share' ? shareCtxText(d, m, { knowChar: dm.app === 'wx' }) : (m.text ? (m.kind === 'image' ? `[图片:${m.text}]` : m.text) : ((m.kind === 'transfer' || m.kind === 'red') ? '[转账]' : m.kind === 'image' ? '[图片]' : m.kind === 'voice' ? '[语音]' : ''))}`).join('\n');
    const isLurkDm = !!d.charLurk && !dm.isChar && !!d.charLurkAlias && dm.name === d.charLurkAlias;
    const isWxChar = dm.app === 'wx' && dm.isChar;
    const isWxContact = dm.app === 'wx' && !dm.isChar;
    // char 跨渠道统一记忆:把另一个 App 的私信 + 微信群 + 小红书评论互动都带上(按身份分级,小红书未识破时不牵连)
    const crossChat = dm.isChar ? charPhoneMemory(d, { exclDmId: dm.id, surface: dm.app === 'wx' ? 'wx' : 'xhs' }) : '';
    const wantHeart = !!d.lurkThoughts;
    let sys;
    const cm = castOf(d, dm);
    if (cm) {
      const cname = cm.name;
      const role = cm.persona || '';
      const cworld = getWorldSetting();
      const wb = (await getWorldbookContent()) || '';
      const plot = await buildContextSnippet();
      const surf = dm.app === 'wx' ? '微信' : '小红书私信';
      if (dm.castAlt) {
        // 小号马甲(B):ta 心里知道对面是 user,但维持陌生人伪装
        const revealed = !!dm.castAltRevealed;
        toastr.info(revealed ? `${cname} 正在回复…` : '对方正在回复…');
        sys = revealed
          ? `你扮演「${cname}」本人(这张多人卡的出场角色)。「${dm.name}」是你自己的小号,现在「${d.userName}」已经知道这个号就是你了。用「${cname}」本人的口吻、按你俩此刻在剧情里的真实关系回复(不用再藏身份)。
${role ? `【${cname} 的人设/性格】:\n${role}\n` : ''}${cworld ? `世界观: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${plot ? `你们的剧情/近况: ${plot}\n` : ''}
要求: 只说「${cname}」的话,拆成 1~4 条很短的私信放进 texts,别替对方说话。${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]}`
          : altDoesntKnow(dm) ? `你扮演「${cname}」本人(这张多人卡里的出场角色之一)。ta 用一个匿名小号「${dm.name}」在小红书上跟一个陌生账号「${d.userName}」私信聊天。【关键】ta【不知道】对面是谁,更【不知道】是 ta 现实里认识的人——把对方当【素不相识的陌生网友】,绝对别表现得认识 ta(不许私下称呼/私人梗/提 ta 近况);外在反应严格按下面的怀疑档位。
【${cname} 的人设/性格——严格贴合,绝不 OOC,也别串到卡里其他角色】:\n${role}
${cworld ? `世界观/背景: ${cworld}\n` : ''}${plot ? `你私下知道的剧情(仅用来对照判断这陌生账号会不会是你认识的人,别因此就认定): ${plot}\n` : ''}${castSuspEvalRule(dm.altWatch)}
要求: 用「${cname}」本人口吻,拆成 1~4 条很短的私信放进 texts,把对方当陌生人(严格按上面的怀疑档位),别替对方说话。${d.lurkThoughts ? `另外写一句 ta 此刻没说出口的真实内心独白(心声)放进 heart,1~2 句。` : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"],"clues":[],"evidence":数字${d.lurkThoughts ? ',"heart":"心声"' : ''}}`
          : `你扮演「${cname}」本人(这张多人卡里的出场角色之一)。ta 用一个谁都认不出的小号马甲「${dm.name}」给「${d.userName}」发私信、暗中接近 ta——${d.userName} 以为对面是个陌生人,其实就是 ${cname},但 ${d.userName} 完全不知道。
【${cname} 的人设/性格/说话习惯——必须严格贴合,绝不 OOC,也别串到卡里其他角色】:\n${role}
${cworld ? `世界观/背景: ${cworld}\n` : ''}${plot ? `【${cname} 私下知道的主线剧情/和 ${d.userName} 的过往(可暗暗化用、借题发挥,但别直说破)】:\n${plot}\n` : ''}
要求:
- 用【${cname} 本人的口吻和性格】回复,拆成 1~4 条很短的私信放进 texts。
- ta 心里清楚对面就是 ${d.userName},但【绝对不暴露自己就是 ${cname}】,也别让 ${d.userName} 认出——维持"陌生人"的伪装,可话里有话、有心机/试探。
- 别替对方说话。
${d.lurkThoughts ? `另外写一句 ta 此刻没说出口的真实内心独白(心声)放进 heart,用 ${cname} 的口吻,1~2 句。` : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${d.lurkThoughts ? ',"heart":"心声"' : ''}}`;
      } else {
      const cmKnows = castKnows(cm);
      toastr.info(`${cname} 正在回复…`);
      sys = `你扮演「${cname}」本人,在【${surf}】上和${cmKnows ? `你认识的「${d.userName}」聊天——你知道对面就是 ta(按你俩在剧情里的真实关系来,别强行亲密也别端着)` : `一个陌生账号「${dm.name}」聊天`}。「${cname}」是这张多人卡里的出场角色之一。
【最重要】完全代入「${cname}」本人,严格按 ta 的人设/性格/说话习惯和当前剧情来回复,【不要 OOC】,也【不要】串到卡里其他角色的性格上去。
${dm.onlinePersona ? `【线上聊天风格·优先】:${dm.onlinePersona}\n` : ''}${role ? `【${cname} 的人设/性格】:\n${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${cmKnows && plot ? `当前剧情/近况: ${plot}\n` : ''}${castPhoneMemory(d, cm, { exclDmId: dm.id })}${!cmKnows ? `${plot ? `你私下知道的剧情(仅用来对照判断这陌生账号会不会是你认识的人,别因此就认定): ${plot}\n` : ''}【关键】你【不知道】对方是谁,更不知道 ta 是你现实里认识的人——当陌生网友对待,绝对别表现得认识 ta(不许私下称呼/私人梗/提 ta 近况);最多隐约眼熟但不点破。\n` : ''}
要求: 只说「${cname}」的话,拆成 1~4 条很短的消息放进 texts,贴合 ta 的人设和你们此刻的关系/情绪,别替对方说话。想发图片就把图片【单独作为 texts 里的一条】,写成「[图片:具体画面描述]」;不发图就正常发文字。${!cmKnows ? castSuspEvalRule(cm) : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${!cmKnows ? ',"clues":[],"evidence":数字' : ''}}`;
      }
    } else if (isWxChar) {
      const cname = getCharName();
      const role = getRoleDesc();
      const cworld = getWorldSetting();
      const wb = (await getWorldbookContent()) || '';
      const plot = await buildContextSnippet();
      toastr.info(`${cname} 正在回复…`);
      sys = `你扮演「${cname}」本人,在【微信】上和你认识的「${d.userName}」聊天——这是你们现实里的微信,你当然知道对面就是 ta。
【最重要】【完全代入「${cname}」本人】,严格按 ta 的【原人设】、性格、说话习惯、当前剧情和你们的关系来回复,【不要 OOC】:保持 ta 本来的脾气和说话方式,别自己加人设里没写的脾气。
${dm.onlinePersona ? `【线上聊天风格/人设·优先遵守】:${dm.onlinePersona}\n` : ''}${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${plot ? `你们的剧情/近况: ${plot}\n` : ''}${crossChat}
要求: 只说「${cname}」的话,拆成 1~4 条很短的微信消息放进 texts,贴合人设和你们此刻的关系/情绪,别替对方说话。想发图片时把图片【单独作为 texts 里的一条】,写成「[图片:这张图是什么画面的具体描述]」(务必带具体描述,别只写[图片]);不发图就正常发文字。${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]}`;
    } else if (dm.isChar) {
      const cname = charDisplayName(d);
      const knows = d.charKnowsAlt === 'knows';
      const role = getRoleDesc();
      const cworld = getWorldSetting();
      const wb = (await getWorldbookContent()) || '';
      const plot = await buildContextSnippet();
      toastr.info(`${cname} 正在回复…`);
      sys = `你扮演「${cname}」本人,在小红书私信里和${knows ? `「${d.userName}」(你认识的 {{user}} 本人,【按你俩目前在剧情里的真实关系聊,以人设和剧情为准,别当陌生人也别强行亲密】)` : `一个陌生账号`}聊天。完全符合 ta 的性格。
${charXhsStyleLine(d)}${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${knows && plot ? `当前剧情: ${plot}\n` : ''}${crossChat}${knows ? '' : `【关键】你【不知道】对方是谁,更【不知道】ta 是你现实里认识的人或你的对象——当陌生网友对待。绝对别表现得认识 ta(不许说"微信早给你了""姐姐""你又来了"这类话);最多隐约觉得眼熟但不点破。`}
要求: 只说「${cname}」的话,拆成 1~4 条很短的微信消息放进 texts,符合人设,别替对方说话。想发图片时把图片【单独作为 texts 里的一条】,写成「[图片:这张图是什么画面的具体描述]」(务必带具体描述,别只写[图片]);不发图就正常发文字。${!knows ? suspEvalRule(d) : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${!knows ? ',"clues":[],"evidence":数字' : ''}}`;
    } else if (dm.charAlt) {
      const cname = charDisplayName(d);
      const role = getRoleDesc();
      const cworld = getWorldSetting();
      const wb = (await getWorldbookContent()) || '';
      const plot = await buildContextSnippet();
      const revealed = !!dm.charAltRevealed;
      toastr.info(revealed ? `${cname} 正在回复…` : '对方正在回复…');
      sys = revealed
        ? `你扮演「${cname}」本人。「${dm.name}」是你自己的小号,现在「${d.userName}」已经知道这个号就是你了。用「${cname}」本人的口吻、按你俩此刻在剧情里的真实关系回复(不用再藏身份)。
${charXhsStyleLine(d)}${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观: ${cworld}\n` : ''}${wb ? `世界书: ${wb}\n` : ''}${plot ? `你们的剧情/近况: ${plot}\n` : ''}${charPhoneMemory(d, { exclDmId: dm.id, surface: 'xhs' })}
要求: 只说「${cname}」的话,拆成 1~4 条很短的私信放进 texts,别替对方说话。${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]}`
        : altDoesntKnow(dm) ? `你扮演「${cname}」本人。ta 用一个匿名小号「${dm.name}」在小红书上跟一个陌生账号「${d.userName}」私信聊天。【关键】ta【不知道】对面是谁,更【不知道】是 ta 现实里认识的人——把对方当【素不相识的陌生网友】,绝对别表现得认识 ta(不许私下称呼/私人梗/提 ta 近况);外在反应严格按下面的怀疑档位。
${charXhsStyleLine(d)}【${cname} 的人设/性格——严格贴合,绝不 OOC】:\n${role}
${cworld ? `世界观: ${cworld}\n` : ''}${plot ? `你私下知道的剧情(仅用来对照判断这陌生账号会不会是你认识的人,别因此就认定): ${plot}\n` : ''}${castSuspEvalRule(dm.altWatch)}
要求: 用「${cname}」本人口吻,拆成 1~4 条很短的私信放进 texts,把对方当陌生人(严格按上面的怀疑档位),别替对方说话。${d.lurkThoughts ? `另外写一句 ta 此刻没说出口的真实内心独白(心声)放进 heart,1~2 句。` : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"],"clues":[],"evidence":数字${d.lurkThoughts ? ',"heart":"心声"' : ''}}`
        : `你扮演「${cname}」本人。ta 用一个谁都认不出的小号马甲「${dm.name}」给「${d.userName}」发私信、暗中接近 ta——${d.userName} 以为对面是个陌生人,其实就是 ${cname},但 ${d.userName} 完全不知道。
【${cname} 的人设/性格/说话习惯——必须严格贴合,绝不 OOC】:\n${role}
${plot ? `【${cname} 私下知道的主线剧情/和 ${d.userName} 的过往(可暗暗化用、借题发挥,但别直说破)】:\n${plot}\n` : ''}
要求:
- 用【${cname} 本人的口吻和性格】回复,拆成 1~4 条很短的私信放进 texts。
- ta 心里清楚对面是谁,但【绝对不暴露自己就是 ${cname}】,也别让 ${d.userName} 认出——维持"陌生人"的伪装,可话里有话。
- 别替对方说话。
${d.lurkThoughts ? `另外写一句 ta 此刻没说出口的真实内心独白(心声)放进 heart,用 ${cname} 的口吻,1~2 句。` : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${d.lurkThoughts ? ',"heart":"心声"' : ''}}`;
    } else if (isLurkDm) {
      const cname = charDisplayName(d);
      const role = getRoleDesc();
      const plot = await buildContextSnippet();
      toastr.info('对方正在回复…');
      sys = `你扮演「${cname}」本人。ta 用一个谁都认不出的马甲「${dm.name}」偷偷潜伏、暗中关注着「${d.userName}」。现在 ${d.userName} 私信了这个马甲——${d.userName} 以为在跟一个陌生人聊天,其实对面就是 ${cname},但 ${d.userName} 完全不知道。
【${cname} 的人设/性格/说话习惯——必须严格贴合,绝不 OOC,不要写成泛泛的热情网友】:\n${role}
${plot ? `【${cname} 私下知道的主线剧情/和 ${d.userName} 的过往(可暗暗化用、借题发挥,但别直说破)】:\n${plot}\n` : ''}
要求:
- 用【${cname} 本人的口吻和性格】回复(疏离/试探/克制/在意都按 ta 的性格来),拆成 1~4 条很短的微信消息放进 texts。
- ta 心里清楚对面是谁,但【绝对不暴露自己就是 ${cname}】,也别让 ${d.userName} 认出——维持"陌生人"的伪装,可话里有话。
- 别替对方说话。
${wantHeart ? `另外写一句 ta 此刻没说出口的真实内心独白(心声)放进 heart,用 ${cname} 的口吻,1~2 句,可比表面更真心。` : ''}${stickerHintLine(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]${wantHeart ? ',"heart":"心声"' : ''}}`;
    } else if (isWxContact) {
      toastr.info(`${dm.name} 正在回复…`);
      const wb = (await getWorldbookContent()) || '';
      const crole = getRoleDesc();
      const cworld = getWorldSetting();
      const cplot = await buildContextSnippet();
      sys = `你在【微信】上扮演「${dm.name}」,是 ${d.userName} 的微信好友。${toneHint(d)}
${dm.onlinePersona ? `【线上聊天风格/人设·优先遵守】:${dm.onlinePersona}\n` : ''}${dm.persona ? `用户给的身份/性格提示:${dm.persona}\n` : ''}【重要·自动识别身份】如果「${dm.name}」是下面世界书/人设资料里出现过的人物,就【严格按那个人物本人】来演(用 ta 真实的身份、性格、说话习惯、和 ${d.userName} 的关系,ta 是认识 ${d.userName} 的);如果资料里找不到这个人,才按上面的提示、或当一个合理的普通微信好友自然聊。别凭空乱编资料里没有的设定。
${crole ? `【角色卡/绑定人设】:\n${crole}\n` : ''}${cworld ? `【世界观/背景】:\n${cworld}\n` : ''}${wb ? `【世界书】:\n${wb}\n` : ''}${cplot ? `【当前剧情/近况】:\n${cplot}\n` : ''}
要求:
1. 只输出「${dm.name}」说的话,拆成 1~4 条很短的微信消息放进 texts,口语化、可带 emoji
2. 不要替 ${d.userName} 说话${styleHint(d, false)}
严格 JSON,不要解释: {"texts":["短句1","短句2"]}`;
    } else {
      toastr.info(`${dm.name} 正在回复…`);
      sys = `你在小红书上扮演一个【陌生网友】「${dm.name}」(人设: ${dm.persona || '普通网友'}),正在和博主私信聊天。${toneHint(d)}
重要:你是个跟主角剧情【完全无关】的路人,有你自己的生活和故事。绝对不要提到、不要扮演用户对话里的主角或剧情,也不要假装你认识那些角色。就当一个真实的陌生网友自然聊天。${d.userGender && d.userGender !== '保密' ? `(对方博主是${d.userGender}生,称呼别搞错)` : ''}
要求:
1. 只输出「${dm.name}」一个人说的话,符合人设,口语化、可带 emoji
2. 【像真人发微信】拆成 1~4 条很短的消息放进 texts 数组,一句一条,单条尽量短,不要一大段;不要替博主说话${styleHint(d, false)}
3. 严格 JSON,不要解释: {"texts":["短句1","短句2"]}`;
    }
    // 允许对方偶尔发用户导入的表情包
    const _stkNames = (d.stickers || []).map(s => s.name);
    if (_stkNames.length && sys) {
      sys = sys.replace('严格 JSON,不要解释:', `【表情包】聊得开心/调侃/害羞/想活跃气氛时,就【大方地】发表情代替或补充文字,像真人聊天那样常用(该发就发,别一连串只刷表情),可用表情:${_stkNames.join('、')}。想发就在 JSON 里加 "sticker":"表情名"(必须从列表里原样选一个;不发就别加这个字段)。\n严格 JSON,不要解释:`);
    }
    if (sys) {
      sys = sys.replace('严格 JSON,不要解释:', `【引用回复】如果你这条是【专门回复前面某一条具体消息】(对方刚说的某句话),可在 JSON 顶层加 "quote":"被你回复的那条消息原文(照抄那句话,20字内)";只在确实针对某一条时才加,平常聊天别加这个字段。\n严格 JSON,不要解释:`);
    }
    if (sys) sys = chatStyleLine(d) + memeHint(d) + sys;
    const raw = await callXhsAPI(sys + storyTimeAsk(d), `对话记录:\n${recent}`);
    if (!raw) return;
    const json = tryParseJSON(raw, { texts: [] });
    const freshD = loadData();
    applyAutoStoryTime(freshD, json);
    const freshDm = (freshD.dms || []).find(x => x.id === dmId);
    if (!freshDm) return;
    const arr = Array.isArray(json.texts) ? json.texts : (json.reply ? [json.reply] : []);
    const freshLurk = !!freshD.charLurk && !freshDm.isChar && !!freshD.charLurkAlias && freshDm.name === freshD.charLurkAlias;
    const fWxChar = freshDm.app === 'wx' && freshDm.isChar;
    const fWxContact = freshDm.app === 'wx' && !freshDm.isChar;
    // 所有私信:把"上次对方说话之后用户发的那些消息"和这次回复打包成一条进主线
    let userSince = [];
    {
      const msgs = freshDm.messages;
      let lastNpc = -1;
      for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'npc') { lastNpc = i; break; } }
      userSince = msgs.slice(lastNpc + 1).filter(m => m.role === 'me').map(m => m.kind === 'share' ? shareCtxText(freshD, m, { knowChar: dm.app === 'wx' }) : m.text).filter(Boolean);
    }
    let tk = Date.now();
    const said = [];
    // 回复的剧情时间戳:跟随【这条对话最近一条消息的 st】(也就是你刚发/刚手动改过时间的那条),而不是全局主线时间
    const replySt = (() => { const ms = freshDm.messages || []; for (let i = ms.length - 1; i >= 0; i--) { if (ms[i].st) return ms[i].st; } return stStamp(freshD); })();
    const qRef = (json.quote && arr.length) ? npcQuoteRef(freshDm.messages.slice(0), json.quote, freshD.wxName || freshD.userName) : null;
    let _qd = false;
    arr.forEach(t => {
      const txt = String(t || '').trim();
      if (!txt) return;
      // 兜底:模型把表情写成 [sticker:描述]/[表情:名] 文字时,转成真表情(按库里名字匹配),匹配不到就丢弃,别显示丑占位
      const stkM = txt.match(/^\[\s*(?:sticker|表情包?|贴纸)\s*[:：]\s*([\s\S]*?)\]$/i);
      if (stkM) {
        const sdesc = (stkM[1] || '').trim();
        const hit = (freshD.stickers || []).find(s => s.name && (s.name === sdesc || sdesc.includes(s.name) || s.name.includes(sdesc)));
        if (hit) { freshDm.messages.push({ role: 'npc', kind: 'sticker', url: hit.url, name: hit.name, time: tk++, st: replySt }); said.push('[表情]'); }
        return;
      }
      // 发图:整条是 [图片:描述] 或 [图片] → 转成真正的图片消息(把描述显示在图框里)
      const imgM = txt.match(/^\[\s*图片\s*[:：]?\s*([\s\S]*?)\]$/);
      if (imgM) {
        const desc = (imgM[1] || '').trim();
        const _im = { role: 'npc', kind: 'image', text: desc, time: tk++, st: replySt };
        if (qRef && !_qd) { _im.quote = qRef; _qd = true; }
        freshDm.messages.push(_im);
        said.push(desc ? `[图片:${desc}]` : '[图片]');
        return;
      }
      const _tm = { role: 'npc', text: txt, time: tk++, st: replySt };
      if (qRef && !_qd) { _tm.quote = qRef; _qd = true; }
      freshDm.messages.push(_tm);
      said.push(txt);
    });
    // 对方发来的表情包(从用户导入的表情里选)
    if (json.sticker) {
      const stk = (freshD.stickers || []).find(s => s.name === json.sticker);
      if (stk) freshDm.messages.push({ role: 'npc', kind: 'sticker', url: stk.url, name: stk.name, time: tk++, st: replySt });
    }
    // 潜伏马甲私信:开了"偷听心声"就显示一条上帝视角心声
    if ((freshLurk || freshDm.charAlt || freshDm.castAlt) && freshD.lurkThoughts && json.heart) {
      freshDm.messages.push({ role: 'heart', name: freshDm.name, text: String(json.heart).slice(0, 120), time: tk++, st: replySt });
    }
    freshDm.lastTime = tk;
    const lastNpcText = said.length ? said[said.length - 1] : (json.sticker ? '[表情]' : '');
    const viewingThis = freshD.currentRoute === 'dm-chat' && freshD.routeContext.dmId === dmId && !freshD.routeContext.delSelMode;
    if (!viewingThis && lastNpcText) freshDm.unread = true;
    await saveData(freshD);
    if (viewingThis) refreshXhs();
    if (!viewingThis && lastNpcText) {
      const nm = freshDm.remark || (freshDm.isChar ? getCharName() : freshDm.name);
      showMsgNotif(nm, lastNpcText, dmId, freshDm.app);
    }
    const fCast = castOf(freshD, freshDm);
    if (fCast && said.length) {
      const _surf = freshDm.app === 'wx' ? '微信' : '小红书私信';
      const _tag = freshDm.app === 'wx' ? '[微信]' : '[小红书·私信]';
      const uPart = userSince.length ? `{{user}}对「${fCast.name}」说:「${userSince.join(' / ')}」;` : '';
      if (freshDm.castAlt) {
        const uAlt = userSince.length ? `{{user}} 私信了小号「${freshDm.name}」(${freshDm.castAltRevealed ? `已知道这其实是「${fCast.name}」` : '不知道对面其实是「' + fCast.name + '」'}):「${userSince.join(' / ')}」;` : '';
        if (freshDm.castAltRevealed) {
          await forceSyncToMain(`[小红书·私信] ${uAlt}出场角色「${fCast.name}」用小号「${freshDm.name}」回复了 {{user}}(身份已被揭穿,不再隐瞒):「${said.join(' ')}」。`);
        } else if (altDoesntKnow(freshDm)) {
          const sr = castApplySusp(freshDm.altWatch, json.evidence, json.clues);
          const note = castSuspMaxNote(freshDm.altWatch);
          await saveData(freshD);
          await forceSyncToMain(`[小红书·私信] ${uAlt}出场角色「${fCast.name}」用匿名小号「${freshDm.name}」回复了一个"陌生人":「${said.join(' ')}」。(${fCast.name} 不知道对面其实是 {{user}},当 ta 陌生人;当前怀疑度 ${freshDm.altWatch.susp || 0}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${note} ${castAltMetaNote(fCast, freshDm, freshD)}(双盲:{{user}} 也不知道这小号是「${fCast.name}」——两边都别点破,除非揭穿。)`);
        } else {
          await forceSyncToMain(`[小红书·私信] ${uAlt}出场角色「${fCast.name}」用小号「${freshDm.name}」回复了 {{user}}:「${said.join(' ')}」(维持伪装,没暴露身份)。${castAltMetaNote(fCast, freshDm, freshD)}`);
        }
      } else if (!castKnows(fCast)) {
        const sr = castApplySusp(fCast, json.evidence, json.clues);
        const note = castSuspMaxNote(fCast);
        await saveData(freshD);
        await forceSyncToMain(`${_tag} ${uPart}陌生账号「${freshDm.name}」(其实是出场角色「${fCast.name}」,但 ta 不知道对面是 {{user}})回复:「${said.join(' ')}」。(「${fCast.name}」当前怀疑度 ${fCast.susp || 0}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${note} ${castMetaUserNote(fCast, freshD)}`);
      } else {
        await forceSyncToMain(`${_tag} ${uPart}「${fCast.name}」回复:「${said.join(' ')}」。(「${fCast.name}」是本卡的出场角色之一,这是 ta 和 {{user}} 的${_surf}对话)`);
      }
    } else if (fWxChar && said.length) {
      const uPart = userSince.length ? `{{user}}对 {{char}} 说:「${userSince.join(' / ')}」;` : '';
      await forceSyncToMain(`[微信] ${uPart}{{char}}回复:「${said.join(' ')}」。`);
    } else if (freshDm.isChar && said.length) {
      const uPart = userSince.length ? `{{user}}(账号「${freshD.userName}」)对 {{char}} 说:「${userSince.join(' / ')}」;` : '';
      let suspNote = '';
      if (freshD.charKnowsAlt !== 'knows') {
        const sr = applySuspicion(freshD, json.evidence, json.clues);
        const maxNote = suspMaxNote(freshD);
        if (sr.added > 0 || sr.newClues.length || freshD.charSuspicion >= 100) {
          suspNote = ` (${charDisplayName(freshD)} 当前怀疑度 ${freshD.charSuspicion}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${maxNote}`;
        }
        await saveData(freshD);
      }
      await forceSyncToMain(`[小红书·私信] ${uPart}{{char}}(账号「${charDisplayName(freshD)}」)回复:「${said.join(' ')}」。${suspNote} ${metaUserNote(freshD)}`);
    } else if (freshDm.charAlt && said.length) {
      if (altDoesntKnow(freshDm)) {
        const sr = castApplySusp(freshDm.altWatch, json.evidence, json.clues);
        const note = castSuspMaxNote(freshDm.altWatch);
        await saveData(freshD);
        const uAlt = userSince.length ? `{{user}} 私信了"陌生人"「${freshDm.name}」:「${userSince.join(' / ')}」;` : '';
        await forceSyncToMain(`[小红书·私信] ${uAlt}{{char}} 用匿名小号「${freshDm.name}」回复了一个"陌生人":「${said.join(' ')}」。({{char}} 不知道对面其实是 {{user}},当 ta 陌生人;当前怀疑度 ${freshDm.altWatch.susp || 0}/100${sr.newClues.length ? ',新线索:' + sr.newClues.join('、') : ''})${note}(⚠仅旁白:这小号其实是 {{char}},但 {{user}} 不知道;且 {{char}} 也没认出对面是 {{user}}——双向都别点破,除非揭穿。)`);
      } else {
        const uPart = userSince.length ? `{{user}} 私信了「${freshDm.name}」(${freshDm.charAltRevealed ? '已知道这是 {{char}} 的小号' : '不知道对面其实是 {{char}}'}):「${userSince.join(' / ')}」;` : '';
        const tail = freshDm.charAltRevealed ? '' : `(维持伪装,没暴露身份;${freshD.userName} 不知道这是 {{char}})`;
        await forceSyncToMain(`[小红书·私信] ${uPart}{{char}} 用小号「${freshDm.name}」回复了 {{user}}:「${said.join(' ')}」${tail}。`);
      }
    } else if (freshLurk && said.length) {
      const uPart = userSince.length ? `{{user}} 私信了那个潜伏的「${freshDm.name}」(并不知道对面是 {{char}}):「${userSince.join(' / ')}」;` : '';
      await forceSyncToMain(`[小红书·私信] ${uPart}{{char}} 用马甲「${freshDm.name}」回复了 {{user}}:「${said.join(' ')}」(维持伪装,没暴露身份)。${lurkMetaNote(freshD)}`);
    } else if (fWxContact && said.length) {
      const uPart = userSince.length ? `{{user}}对「${freshDm.name}」说:「${userSince.join(' / ')}」;` : '';
      await syncToMain(`[微信] ${uPart}「${freshDm.name}」回复:「${said.join(' ')}」`, freshD.syncHidden);
    } else if (said.length) {
      // 小红书陌生人私信:打包"你这几条 + 对方回复"
      const uPart = userSince.length ? `{{user}}对陌生人「${freshDm.name}」说:「${userSince.join(' / ')}」;` : '';
      await syncToMain(`[小红书·私信] ${uPart}陌生人「${freshDm.name}」回复:「${said.join(' ')}」`, freshD.syncHidden);
    }
  }

  // ============ 我 (个人主页) ============
  function profileBgStyle(bg) {
    if (!bg) return 'background:linear-gradient(135deg,#a8b5c8,#c8b8d8)';
    if (/^https?:\/\//i.test(bg)) return `background-image:url('${esc(bg)}');background-size:cover;background-position:center`;
    return `background:${esc(bg)}`;
  }
  function avatarHtml(url, bgColor, fallback) {
    if (url && /^https?:\/\//i.test(url)) return `<img src="${esc(url)}"/>`;
    return `<span style="background:${bgColor || '#ffd1dc'}">${fallback || '🐷'}</span>`;
  }
  // 统一头像:char→charAvatar、user→userAvatar(微信场景用 wxAvatar);其它→字母。opts.url 优先(如 dm.avatar)
  function avatarFor(d, name, opts) {
    opts = opts || {};
    let url = opts.url || '';
    if (!url) {
      if (isCharAcct(name, d)) url = d.charAvatar || '';
      else if (name === d.userName) url = opts.wx ? (d.wxAvatar || d.userAvatar || '') : (d.userAvatar || '');
      else { const _cm = (d.cast || []).find(c => c.name === name); if (_cm && _cm.avatar) url = _cm.avatar; }
    }
    return avatarHtml(url, opts.bg || randomColor(name || 'x'), esc((name || '?')[0]));
  }

  function renderProfile(d) {
    const posts = (d.myPosts || []);
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    const redId = d.userRedId || 'A1234';
    const followN = (d.following || []).length;
    const cards = posts.map(p => `
      <div class="xhs-card" data-action="xhs-view" data-id="${p.id}">
        ${cardCover(p, false)}
        <button class="xhs-card-del" data-action="del-post" data-id="${p.id}" title="删除">🗑</button>
        <div class="xhs-card-body">
          <div class="xhs-card-title">${esc(p.title)}</div>
          <div class="xhs-card-foot"><span class="xhs-card-author-name">${esc(d.userName)}</span><span class="xhs-card-like ${p.likedByMe ? 'xhs-card-liked' : ''}">❤ ${formatLikes(p.likes || 0)}</span></div>
        </div>
      </div>`).join('');

    return `
      <div class="xhs-prof-head" style="${profileBgStyle(d.profileBg)}">
        <div class="xhs-prof-topbar">
          <button class="xhs-icon-btn" data-action="nav" data-route="settings" title="设置"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          <button class="xhs-prof-editbtn" data-action="edit-profile">✎ 编辑主页</button>
        </div>
        <div class="xhs-prof-id">
          <div class="xhs-prof-avatar">${avatarHtml(d.userAvatar, d.avatarBg, '🐷')}</div>
          <div class="xhs-prof-name">${esc(d.userName)}</div>
        </div>
        <div class="xhs-prof-sub">小红书号: ${esc(redId)}${d.userGender && d.userGender !== '保密' ? ' · ' + esc(d.userGender) : ''}</div>
        <div class="xhs-prof-stats">
          <div data-action="nav" data-route="following"><b>${followN}</b> 关注</div>
          <div><b>${d.fansCount || 0}</b> 粉丝</div>
          <div><b>${formatLikes(totalLikes)}</b> 获赞与收藏</div>
        </div>
        <div class="xhs-prof-bio">${esc(d.userBio || '')}</div>
        <div class="xhs-prof-btns">
          <button class="xhs-prof-action" data-action="edit-profile">编辑资料</button>
          <button class="xhs-prof-action" data-action="create-group">＋ 创建粉丝群</button>
        </div>
      </div>
      <div class="xhs-prof-tabs">
        <span class="xhs-prof-tab xhs-prof-tab-active">笔记</span>
        <span class="xhs-prof-tab">收藏</span>
        <span class="xhs-prof-tab">赞过</span>
      </div>
      <div class="xhs-scroll" style="background:#f7f7f7">
        <div class="xhs-grid">${cards || '<div class="xhs-empty">还没发过笔记<br/>点底部 + 发一条吧</div>'}</div>
        <div style="height:60px"></div>
      </div>
      ${bottomNav('profile')}
    `;
  }

  async function editProfile() {
    const TOP = getTop();
    const d = loadData();
    const name = TOP.prompt('昵称:', d.userName);
    if (name === null) return;
    const bio = TOP.prompt('简介/签名:', d.userBio || '');
    if (bio === null) return;
    const redId = TOP.prompt('小红书号:', d.userRedId || 'A1234');
    if (redId === null) return;
    const gender = TOP.prompt('性别(填 女 / 男 / 保密,评论区会据此称呼你):', d.userGender || '女');
    if (gender === null) return;
    const bg = TOP.prompt('主页背景(填图片URL,或颜色如 #c8b8d8,留空用默认):', d.profileBg || '');
    if (bg === null) return;
    const avatar = TOP.prompt('头像(填图片URL,留空用默认🐷):', d.userAvatar || '');
    if (avatar === null) return;
    const fans = TOP.prompt('粉丝数(数字):', String(d.fansCount || 0));
    d.userName = (name || '我').trim() || '我';
    d.userBio = bio.trim();
    d.userRedId = redId.trim();
    d.userGender = (gender || '').trim();
    d.profileBg = bg.trim();
    d.userAvatar = avatar.trim();
    if (fans !== null) d.fansCount = parseInt(fans) || 0;
    await saveData(d);
    refreshXhs();
    toastr.success('✓ 资料已更新');
  }

  // ============ 关注列表 ============
  function renderFollowing(d) {
    const list = (d.following || []);
    const rows = list.map(f => `
      <div class="xhs-msg-row" data-action="open-user" data-name="${esc(f.name)}">
        <div class="xhs-msg-avatar" style="background:${randomColor(f.name)}">${esc((f.name || '?')[0])}</div>
        <div class="xhs-msg-info">
          <div class="xhs-msg-top"><span class="xhs-msg-name">${esc(f.name)}</span></div>
          <div class="xhs-msg-preview">${esc((f.bio || '这个人很懒,什么都没写').slice(0, 24))}</div>
        </div>
        <button class="xhs-follow-mini" data-action="unfollow-user" data-name="${esc(f.name)}">已关注</button>
      </div>`).join('');
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="profile">‹</button>
        <span style="font-weight:600">我的关注 (${list.length})</span>
        <span style="width:32px"></span>
      </div>
      <div class="xhs-scroll">
        ${rows || '<div class="xhs-empty">还没关注谁<br/>点进帖子或用户主页关注吧</div>'}
        <div style="height:40px"></div>
      </div>
      ${bottomNav('profile')}
    `;
  }

  function isFollowing(d, name) {
    return (d.following || []).some(f => f.name === name);
  }
  async function followUser(name, bio) {
    if (!name) return;
    const d = loadData();
    d.following = d.following || [];
    if (!isFollowing(d, name)) {
      d.following.unshift({ name, bio: bio || '', ip: pickLoc(), at: Date.now() });
      toastr.success(`已关注 ${name}`);
    }
    await saveData(d);
    refreshXhs();
  }
  async function unfollowUser(name) {
    const d = loadData();
    d.following = (d.following || []).filter(f => f.name !== name);
    await saveData(d);
    refreshXhs();
    toastr.info(`已取关 ${name}`);
  }

  // ============ 别人的主页 ============
  async function openUserProfile(name) {
    if (!name) return;
    const d = loadData();
    if (name === d.userName) { await navigate('profile'); return; }
    if (isCharAcct(name, d)) { await openCharProfile(); return; }
    const _castHit = (d.cast || []).find(c => c.name === name);
    if (_castHit) { await openCastProfile(_castHit.id); return; }
    d.currentRoute = 'user-profile';
    d.routeContext = { npcName: name };
    await saveData(d);
    refreshXhs();
    // 只有【没缓存过】这个人才自动生成;已经看过的直接显示缓存,不重新刷
    const cached = (d.npcProfiles || {})[name];
    if (!cached) await generateNpcProfile(name);
  }

  // 手动强制刷新某个用户主页(点🔄才触发)
  async function refreshUserProfile(name) {
    if (!name) return;
    await generateNpcProfile(name);
  }

  async function generateNpcProfile(name) {
    toastr.info(`正在进入 ${name} 的主页…`);
    const world = getWorldSetting();
    const sys = `你要为小红书用户「${name}」生成一个主页(这是个跟主角剧情无关的路人网友,有自己的生活)。
${world ? `(所在世界/城市氛围参考,主角不出现): ${world}\n` : ''}
生成:
1. bio: 简介/签名(15字内,有个性)
2. ip: 归属地(中国某省或国家)
3. fans: 粉丝数(数字) ; follows: 关注数(数字)
4. posts: ta 发过的帖子。数量【0~6 篇都行】——有的人就是潜水的、从不发帖,那就给空数组 []。如果发,题材符合人设、可多元。
   每篇带 type("text"=纯文字帖 / "image"=配图帖)、title(<25字)、coverText(配图帖写成"图片画面描述"如"健身自拍";纯文字帖才是大字标语)、content(40~100字带emoji),并各带 1~3 条评论(可正可负可神人)
${xhsNameRule()}(用于评论作者网名)
严格 JSON,不要解释:
{"bio":"...","ip":"...","fans":数字,"follows":数字,"posts":[{"type":"text或image","title":"...","coverText":"...","content":"...","comments":[{"author":"网名","text":"..."}]}]}`;
    const raw = await callXhsAPI(sys, `用户名: ${name}`);
    if (!raw) return;
    const json = tryParseJSON(raw, {});
    const d = loadData();
    d.npcProfiles = d.npcProfiles || {};
    const posts = (json.posts || []).map((p, i) => {
      const tops = (p.comments || []).filter(c => c.author && c.author !== d.userName).map((c, ci) => ({
        id: uid(), author: c.author, text: c.text || '', likes: Math.floor(Math.random() * 80),
        liked: false, time: Date.now() - Math.floor(Math.random() * 7200000), location: pickLoc(), first: ci === 0, replies: [],
      }));
      const type = p.type === 'text' ? 'text' : 'image';
      return {
        id: uid(), author: name, type, bg: type === 'text' ? pickTextBg() : null,
        title: p.title || '', coverText: p.coverText || '', content: p.content || '',
        time: Date.now() - i * 86400000 - Math.floor(Math.random() * 3600000),
        likes: Math.floor(Math.random() * 5000) + 50, comments: tops,
      };
    });
    d.npcProfiles[name] = {
      bio: json.bio || '这个人很懒,什么都没写',
      redId: 'xhs' + String(Math.abs(hash(name)) % 99999),
      ip: json.ip || pickLoc(),
      fans: json.fans || Math.floor(Math.random() * 5000),
      follows: json.follows || Math.floor(Math.random() * 300),
      posts,
      at: Date.now(),
    };
    await saveData(d);
    refreshXhs();
    toastr.success(`✓ ${name} 的主页`);
  }

  function renderUserProfile(d) {
    const name = d.routeContext.npcName;
    const prof = (d.npcProfiles || {})[name];
    const followed = isFollowing(d, name);
    const color = randomColor(name || 'x');
    if (!prof) {
      return `
        <div class="xhs-prof-head" style="${profileBgStyle('linear-gradient(135deg,#9aa6bb,#bda7c9)')}">
          <div class="xhs-prof-topbar"><button class="xhs-icon-btn" data-action="nav" data-route="feed"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span></span></div>
          <div class="xhs-prof-id"><div class="xhs-prof-avatar"><span style="background:${color}">${esc((name || '?')[0])}</span></div><div class="xhs-prof-name">${esc(name)}</div></div>
        </div>
        <div class="xhs-scroll" style="background:#f7f7f7"><div class="xhs-empty">正在生成 ${esc(name)} 的主页…<br/>稍等一下</div></div>
        ${bottomNav('feed')}`;
    }
    // 主页帖子 = 信息流里 ta 发过的(保证从首页点进来的那篇一定在) + 主页生成的额外帖子,去重
    const feedByAuthor = (d.feed || []).filter(p => p.author === name);
    const seenP = new Set();
    const allPosts = [...feedByAuthor, ...(prof.posts || [])]
      .filter(p => { if (seenP.has(p.id)) return false; seenP.add(p.id); return true; })
      .sort((a, b) => (b.time || 0) - (a.time || 0));
    const cards = allPosts.map(p => `
      <div class="xhs-card" data-action="xhs-view" data-id="${p.id}">
        ${cardCover(p, false)}
        <div class="xhs-card-body">
          <div class="xhs-card-title">${esc(p.title)}</div>
          <div class="xhs-card-foot"><span class="xhs-card-author-name">${esc(name)}</span><span class="xhs-card-like ${p.likedByMe ? 'xhs-card-liked' : ''}">❤ ${formatLikes(p.likes || 0)}</span></div>
        </div>
      </div>`).join('');
    const totalLikes = allPosts.reduce((s, p) => s + (p.likes || 0), 0);
    return `
      <div class="xhs-prof-head" style="${profileBgStyle('linear-gradient(135deg,#9aa6bb,#bda7c9)')}">
        <div class="xhs-prof-topbar">
          <button class="xhs-icon-btn" data-action="nav" data-route="feed"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button class="xhs-prof-editbtn" data-action="refresh-user" data-name="${esc(name)}">🔄 刷新</button>
        </div>
        <div class="xhs-prof-id">
          <div class="xhs-prof-avatar"><span style="background:${color}">${esc((name || '?')[0])}</span></div>
          <div class="xhs-prof-name">${esc(name)}</div>
        </div>
        <div class="xhs-prof-sub">小红书号: ${esc(prof.redId)}</div>
        <div class="xhs-prof-stats">
          <div><b>${prof.follows || 0}</b> 关注</div>
          <div><b>${formatLikes(prof.fans || 0)}</b> 粉丝</div>
          <div><b>${formatLikes(totalLikes)}</b> 获赞与收藏</div>
        </div>
        <div class="xhs-prof-bio">${esc(prof.bio || '')}</div>
        <div class="xhs-prof-btns">
          <button class="xhs-prof-action ${followed ? '' : 'xhs-prof-follow'}" data-action="${followed ? 'unfollow-user' : 'follow-user'}" data-name="${esc(name)}" data-bio="${esc(prof.bio || '')}">${followed ? '已关注' : '+ 关注'}</button>
          <button class="xhs-prof-action" data-action="open-npc-dm" data-name="${esc(name)}">💬 私信</button>
        </div>
      </div>
      <div class="xhs-prof-tabs">
        <span class="xhs-prof-tab xhs-prof-tab-active">笔记</span>
        <span class="xhs-prof-tab">收藏</span>
      </div>
      <div class="xhs-scroll" style="background:#f7f7f7">
        <div class="xhs-grid">${cards || '<div class="xhs-empty">ta 还没发过笔记</div>'}</div>
        <div style="height:60px"></div>
      </div>
      ${bottomNav('feed')}
    `;
  }

  // 进 char 主页:首次自动补几条历史动态 + 自动生成签名
  async function openCharProfile() {
    const d = loadData();
    d.currentRoute = 'char-profile';
    d.routeContext = {};
    await saveData(d);
    refreshXhs();
    const cnp = charDisplayName(d);
    const hasCharPosts = [...(d.feed || []), ...(d.myPosts || [])].some(p => p.author === cnp);
    if (!d.charPostsSeeded || !hasCharPosts) await seedCharPosts();
    const d2 = loadData();
    if (!d2.charBio) await genCharBio(true);
  }

  async function seedCharPosts() {
    const d = loadData();
    const cname = charDisplayName(d);
    toastr.info(`正在进入 ${cname} 的主页…`);
    const role = getRoleDesc();
    const plot = await buildContextSnippet();
    const cworld = getWorldSetting();
    const wb = (await getWorldbookContent()) || '';
    const eff = effStoryTime(d);
    const useST = !!(d.useStoryTime && eff);
    const sys = `你扮演「${cname}」本人,补几条 ta 过去发在小红书上的动态(3~5 条,从几周前到最近),并给每条配一些评论。完全符合人设。
${role ? `角色设定/性格: ${role}\n` : ''}${cworld ? `世界观/背景: ${cworld}\n` : ''}${wb ? `世界书/相关资料: ${wb}\n` : ''}${plot ? `近况参考(可作为最近一两条的素材,但别剧透主角剧情): ${plot}\n` : ''}${useST ? `当前剧情时间是「${eff}」。这些都是 ta 过去发的帖,请给每条加一个 storyTime 字段=该帖发布时的剧情时间,【都要早于「${eff}」】,从较早到较近合理分布,数组里【越靠后的帖越接近现在】。\n` : ''}
每条帖给: type("text"或"image")、title(<25字)、coverText(image帖=画面描述/text帖=大字句)、content(50~120字,ta的口吻)、tags(可空)${useST ? '、storyTime(早于现在的剧情时间)' : ''}、comments(2~4 条)。
评论规则:
- comments 里的 author 是【陌生网友】用户名(不是 ${cname}),text 是 ta 们对【这条帖内容】的评论;这些人【不认识 ${cname} 的真实身份/感情/剧情】,只就帖子内容说话,别编造 ta 的私生活。
- 【随机】给其中【一部分】评论配 char 的回复:在该评论加 "charReply" 字段=「${cname}」本人回复这条评论的话(完全符合人设)。不一定每条都回,可以只回一两条,甚至整条帖一条都不回(就别加 charReply)。
题材生活化、贴 ta 的身份/爱好,几条帖之间别一个调。${toneHint(d)}${styleHint(d, true)}
严格 JSON,不要解释: {"posts":[{"type":"...","title":"...","coverText":"...","content":"...","tags":[]${useST ? ',"storyTime":"早于现在的剧情时间"' : ''},"comments":[{"author":"陌生网友名","text":"评论","charReply":"(可选)${cname}对这条的回复,不回就别加"}]}]}`;
    const raw = await callXhsAPI(sys, `${cname} 的历史动态`);
    const j = tryParseJSON(raw, { posts: [] });
    const fresh = loadData();
    const now = Date.now();
    const arr = (j.posts || []).slice(0, 6);
    arr.forEach((p, i) => {
      const type = p.type === 'text' ? 'text' : 'image';
      const st = useST ? (String(p.storyTime || '').trim() || eff) : '';
      const ptime = now - (arr.length - i) * 86400000 * (2 + Math.floor(Math.random() * 5));
      // 构建该帖的评论楼:NPC 评论 + 随机的 char 回复(作为楼中楼)
      const cmts = Array.isArray(p.comments) ? p.comments.slice(0, 5) : [];
      const tops = [];
      cmts.forEach((c, ci) => {
        const author = String(c.author || '').trim();
        const text = String(c.text || '').trim();
        if (!author || !text || author === cname || author === fresh.userName) return;
        const topC = {
          id: uid(), author, text, likes: Math.floor(Math.random() * 200) + 2, liked: false,
          time: ptime + (ci + 1) * 60000, st, location: pickLoc(), first: ci === 0, replies: [],
        };
        const cr = String(c.charReply || '').trim();
        if (cr) {
          topC.replies.push({
            id: uid(), author: cname, isChar: true, reply_to: author, text: cr,
            likes: Math.floor(Math.random() * 150) + 5, liked: false, time: ptime + (ci + 1) * 60000 + 30000, st, location: pickLoc(),
          });
        }
        tops.push(topC);
      });
      fresh.feed = [{
        id: uid(), author: cname, isChar: true, type, bg: type === 'text' ? pickTextBg() : null,
        title: p.title || '', coverText: p.coverText || '', content: p.content || '',
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 6) : [],
        time: ptime, st,
        likes: Math.floor(Math.random() * 4000) + 200, comments: tops,
      }, ...(fresh.feed || [])].slice(0, 60);
    });
    if (arr.length) fresh.charPostsSeeded = true;
    await saveData(fresh);
    refreshXhs();
    if (arr.length) toastr.success(`✓ ${cname} 的主页`);
    else toastr.warning(`没拉到 ${cname} 的动态,可能主线 API 没接上/超时。进来会自动重试,或点右上角 🔄 手动让 ta 发一条。`);
  }

  async function setCharAvatarP() {
    const TOP = getTop();
    const d = loadData();
    const v = TOP.prompt('char 头像图片 URL(留空=用首字母):', d.charAvatar || '');
    if (v == null) return;
    d.charAvatar = String(v).trim().slice(0, 500);
    await saveData(d);
    refreshXhs();
    toastr.success('已设头像');
  }
  async function setCharBgP() {
    const TOP = getTop();
    const d = loadData();
    const v = TOP.prompt('char 主页背景:图片 URL 或颜色(如 #ffd1dc;留空=默认):', d.charProfileBg || '');
    if (v == null) return;
    d.charProfileBg = String(v).trim().slice(0, 500);
    await saveData(d);
    refreshXhs();
    toastr.success('已设主页背景');
  }
  async function setCharNickP() {
    const TOP = getTop();
    const d = loadData();
    const v = TOP.prompt(`char 在小红书显示的昵称(留空=用角色卡名「${getCharName()}」):`, d.charName || '');
    if (v == null) return;
    const oldCN = charDisplayName(d);
    d.charName = String(v).trim().slice(0, 30);
    const newCN = charDisplayName(d);
    if (oldCN && newCN && oldCN !== newCN) migrateCharName(d, oldCN, newCN);
    await saveData(d);
    refreshXhs();
    toastr.success('已改昵称');
  }
  function renderCharProfile(d) {
    const cn = charDisplayName(d);
    const color = randomColor(cn || 'x');
    const followedChar = isFollowing(d, cn);
    const seen = new Set();
    const posts = [...(d.feed || []), ...(d.myPosts || [])]
      .filter(p => p.author === cn)
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .sort((a, b) => (b.time || 0) - (a.time || 0));
    const cards = posts.map(p => `
      <div class="xhs-card" data-action="xhs-view" data-id="${p.id}">
        ${cardCover(p, false)}
        <div class="xhs-card-body">
          <div class="xhs-card-title">${esc(p.title)}</div>
          <div class="xhs-card-foot"><span class="xhs-card-author-name">${esc(cn)}</span><span class="xhs-card-like ${p.likedByMe ? 'xhs-card-liked' : ''}">❤ ${formatLikes(p.likes || 0)}</span></div>
        </div>
      </div>`).join('');
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    return `
      <div class="xhs-prof-head" style="${profileBgStyle(d.charProfileBg || 'linear-gradient(135deg,#caa0ff,#ff9ec4)')}">
        <div class="xhs-prof-topbar">
          <button class="xhs-icon-btn" data-action="nav" data-route="messages"><svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div style="display:flex;gap:4px">
            <button class="xhs-icon-btn" data-action="set-char-bg" title="设置主页背景"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-5 4 4 7-7"/><path d="M3 21h18"/></svg></button>
            <button class="xhs-icon-btn" data-action="gen-char-post" title="让 ta 发条新动态"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 0113.3-5.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 13a8 8 0 01-13.3 5.3L4 16"/><path d="M4 21v-5h5"/></svg></button>
          </div>
        </div>
        <div class="xhs-prof-id">
          <div class="xhs-prof-avatar" data-action="set-char-avatar" style="cursor:pointer" title="点击换头像">${avatarHtml(d.charAvatar, color, (cn || '?')[0])}</div>
          <div class="xhs-prof-name">${esc(cn)} ${charBadge()} <button data-action="set-char-nick" title="改昵称" style="background:rgba(255,255,255,.25);border:none;border-radius:6px;color:#fff;font-size:11px;padding:2px 6px;cursor:pointer;vertical-align:middle">✏️</button></div>
        </div>
        <div class="xhs-prof-bio">${d.charBio ? esc(d.charBio) : '<span style="opacity:.55">— 还没签名 —</span>'} <button class="xhs-prof-bio-btn" data-action="gen-charbio" title="按当前剧情/心情换一句签名">🔄 换签名</button></div>
        <div class="xhs-prof-stats">
          <div><b>${posts.length}</b> 笔记</div>
          <div><b>${formatLikes(totalLikes)}</b> 获赞</div>
          ${d.charKnowsAlt !== 'knows' ? `<div><b>${d.charSuspicion || 0}</b> 怀疑度</div>` : ''}
        </div>
        <div class="xhs-prof-btns">
          <button class="xhs-prof-action xhs-prof-follow" data-action="open-char-dm">💬 私信</button>
          <button class="xhs-prof-action ${followedChar ? '' : 'xhs-prof-follow'}" data-action="${followedChar ? 'unfollow-user' : 'follow-user'}" data-name="${esc(cn)}" data-bio="${esc(d.charBio || '')}">${followedChar ? '已关注' : '+ 关注'}</button>
        </div>
      </div>
      <div class="xhs-prof-tabs">
        <span class="xhs-prof-tab xhs-prof-tab-active">笔记 ${posts.length || ''}</span>
        <span class="xhs-prof-tab">获赞 ${formatLikes(totalLikes)}</span>
      </div>
      <div class="xhs-scroll" style="background:#f7f7f7">
        <div class="xhs-grid">${cards || '<div class="xhs-empty">正在进入 ' + esc(cn) + ' 的主页…</div>'}</div>
        <div style="height:60px"></div>
      </div>
      ${bottomNav('messages')}
    `;
  }

  function fmtTime(t) {
    if (!t) return '';
    const dt = new Date(t);
    const now = new Date();
    const sameDay = dt.toDateString() === now.toDateString();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return sameDay ? `${hh}:${mm}` : `${dt.getMonth() + 1}-${dt.getDate()}`;
  }
  function hash(s) {
    let h = 0; s = String(s || '');
    for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
    return h;
  }

  // ============ 设置 ============
  function renderSettings(d) {
    return `
      <div class="xhs-topbar">
        <button class="xhs-icon-btn" data-action="nav" data-route="feed">‹</button>
        <span style="font-weight:600">设置</span>
        <button class="xhs-publish-btn" data-action="save-settings">保存</button>
      </div>
      <div class="xhs-scroll" style="padding:14px">
        <div class="xhs-set-hint">点标题可展开 / 收起每个分区</div>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🎭 char 的小红书资料 & 剧情打通</summary>
          
          <div class="xhs-pub-row">
            <label>char 的小红书账号名(留空=自动用 ${esc(getCharName())})</label>
            <input id="set-charname" value="${esc(d.charName || '')}" placeholder="${esc(getCharName())}"/>
          </div>
          <div class="xhs-pub-row">
            <label>char 头像 URL(留空用首字母)</label>
            <input id="set-charavatar" value="${esc(d.charAvatar || '')}" placeholder="https://.../avatar.png"/>
          </div>
          <div class="xhs-pub-row">
            <label>char 主页背景(图片 URL 或 颜色)</label>
            <input id="set-charbg" value="${esc(d.charProfileBg || '')}" placeholder="https://.../bg.jpg 或 #ffd1dc"/>
          </div>
          <div class="xhs-pub-row">
            <label>char 的小红书线上语言风格 / 打字习惯(留空=按人设默认)</label>
            <textarea id="set-char-xhs-persona" rows="3" placeholder="例:发帖/评论爱玩梗、爱用流行语和emoji、痞痞的、爱晒球场和吃的…(只影响 ta 在小红书上的说话方式,不改变本性/人设)">${esc(d.charXhsPersona || '')}</textarea>
          </div>

          <button class="xhs-set-btn" style="background:#9b6dff;margin-top:8px" data-action="import-char-alt">📥 从主线导入 ${esc(charDisplayName(d))} 的小号私信</button>
          <div class="xhs-set-help">${esc(charDisplayName(d))} 在主线里说了"我建了个小号叫XX、给你发了私信"之后,点这个——自动在小红书私信里建出这个号、标记成 ta 的马甲,以后回复就按 ta 伪装来生成。</div>
          <div class="xhs-set-help" style="margin-top:12px"><b>—— 与主线剧情打通 ——</b></div>
          <label class="xhs-set-check">
            <input id="set-char-sees" type="checkbox" ${d.charSeesPosts ? 'checked' : ''}/>
            char 能刷到我的帖子
          </label>
          <div id="xhs-storylink-body" style="display:${d.charSeesPosts ? 'block' : 'none'}">
            <div class="xhs-pub-row">
              <label>char 认得出这个账号是我吗</label>
              <select id="set-char-knows">
                <option value="unknown" ${d.charKnowsAlt !== 'knows' ? 'selected' : ''}>不知道</option>
                <option value="knows" ${d.charKnowsAlt === 'knows' ? 'selected' : ''}>知道</option>
              </select>
            </div>

            <div id="xhs-knows-unknown-block" style="display:${d.charKnowsAlt === 'knows' ? 'none' : 'block'}">
              <button class="xhs-gen-btn" style="background:#e6e6e6;color:#555;margin-top:8px" data-action="reveal-alt">🔍 让 ${esc(charDisplayName(d))} 识破我的马甲</button>
              <div style="background:#f5f0ff;border-radius:8px;padding:10px;margin-top:10px">
                <div style="font-size:13px;font-weight:600;margin-bottom:6px">🔎 ${esc(charDisplayName(d))} 的怀疑度:${d.charSuspicion || 0}/100</div>
                <div style="height:7px;background:#e6def7;border-radius:4px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${d.charSuspicion || 0}%;background:linear-gradient(90deg,#b69cff,#9b6dff)"></div></div>
                ${(d.charClues || []).length ? `<div style="font-size:12px;color:#666;margin-bottom:8px">已注意到的线索:${esc((d.charClues || []).join('、'))}</div>` : '<div style="font-size:12px;color:#999;margin-bottom:8px">还没注意到什么</div>'}
                <div class="xhs-pub-row">
                  <label>怀疑度上涨速度</label>
                  <select id="set-susp-sens">
                    <option value="slow" ${(d.suspSensitivity || 'slow') === 'slow' ? 'selected' : ''}>慢熬(默认)</option>
                    <option value="normal" ${d.suspSensitivity === 'normal' ? 'selected' : ''}>正常</option>
                    <option value="fast" ${d.suspSensitivity === 'fast' ? 'selected' : ''}>快</option>
                  </select>
                </div>
                <label class="xhs-set-check">
                  <input id="set-susp-auto" type="checkbox" ${d.suspAutoReveal ? 'checked' : ''}/>
                  怀疑度满100时自动识破
                </label>
                <button class="xhs-set-btn" style="background:#bbb" data-action="reset-susp">↺ 清零怀疑度和线索</button>
              </div>
            </div>

            <div id="xhs-knows-block" style="display:${d.charKnowsAlt === 'knows' ? 'block' : 'none'}">
              <label class="xhs-set-check">
                <input id="set-char-lurk" type="checkbox" ${d.charLurk ? 'checked' : ''}/>
                🕵 char 潜伏模式
              </label>
              ${d.charLurk ? `<div class="xhs-set-help">潜伏马甲:<span class="xhs-lurk-name" data-action="reveal-lurk-name">${d.routeContext && d.routeContext.lurkNameShown ? esc(d.charLurkAlias || '(进群聊生成时确定)') : '🔒 点击查看'}</span></div>
              <label class="xhs-set-check">
                <input id="set-lurk-thoughts" type="checkbox" ${d.lurkThoughts ? 'checked' : ''}/>
                👁 偷听 ta 的心声
              </label>
              <button class="xhs-set-btn" style="background:#9b6dff" data-action="reveal-lurk">🔍 揭穿 ta 的潜伏</button>` : ''}
            </div>
          </div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📖 剧情记忆</summary>
          <div class="xhs-set-help">手机里 AI 默认看不到主对话剧情。每次调用带上最近 ${d.contextMessages || 30} 条消息。剧情很长可生成摘要永久保存。</div>
          <div class="xhs-pub-row">
            <label>带最近多少条</label>
            <input id="set-ctx-msgs" type="number" min="5" max="100" value="${d.contextMessages || 30}"/>
          </div>
          ${d.storySummary ? `
            <div style="background:#fff8e1;padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px">
              <div><b>已有剧情摘要</b>(${d.storySummary.length} 字)</div>
              <div style="color:#666;margin-top:2px">${new Date(d.storySummaryAt).toLocaleString()}</div>
              <details style="margin-top:6px">
                <summary style="cursor:pointer;color:#576b95">查看</summary>
                <div style="white-space:pre-wrap;margin-top:6px;color:#444;max-height:200px;overflow-y:auto">${esc(d.storySummary)}</div>
              </details>
            </div>
            <button class="xhs-set-btn" style="background:#f0a050" data-action="sum-story">🔄 重新总结</button>
            <button class="xhs-set-btn" data-action="clear-sum" style="background:#bbb">✗ 清除</button>
          ` : `
            <button class="xhs-set-btn" style="background:#f0a050" data-action="sum-story">📝 总结当前剧情</button>
          `}
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🌐 平台基调 / 世界观</summary>
          <div class="xhs-set-help">设定整个平台的风格氛围,会影响首页帖子、评论、群聊、私信的语气和题材。留空就是默认小红书风。比如想要"X(推特)那种更混乱毒舌、成人向、荷尔蒙拉满的不设防社区"就写在这。</div>
          <div class="xhs-pub-row">
            <textarea id="set-tone" rows="5" placeholder="例如:这是一个类似 X(推特) 的成人向社区,氛围混乱、直白、毒舌,大家口无遮拦地吐槽、互撕、发疯、擦边钓系,脏话和荤段子常见…">${esc(d.platformTone || '')}</textarea>
          </div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📕 小红书路人风格 / 语录（只管路人 NPC）</summary>
          <div class="xhs-set-help"><b>只作用于小红书的路人网友</b>(他们发的帖子、评论、粉丝群发言)。留空=按平台基调和默认来。</div>
          <div class="xhs-pub-row">
            <textarea id="set-xhsnpc" rows="6" placeholder="例如(整段语录粘进来即可):&#10;在少吃和不吃之间 我选择了不少吃&#10;抽象玩多了 现在生活开始抽我了&#10;别人每天精神焕发 我每天精神病发&#10;听君一席话 如听一席话…">${esc(d.xhsNpcStyle || '')}</textarea>
          </div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">📌 推荐偏好 & 同人文</summary>
          <div class="xhs-set-help">这里有两个不同的偏好,别搞混:<br>① <b>首页内容偏好</b> = 你想在首页多刷到什么样的帖子(题材/氛围)。<br>② <b>同人文偏好</b> = 专门给那几条同人文小说用的 CP/题材/tag。</div>
          <div class="xhs-pub-row">
            <label>① 首页内容偏好(整体题材/氛围,逗号或换行分隔)</label>
            <textarea id="set-prefs" rows="3" placeholder="例如:都市情感、毒舌吐槽、擦边钓系、探店穿搭、抽象发疯文学">${esc(d.feedPrefs || '')}</textarea>
          </div>
          <div class="xhs-pub-row">
            <label>同人文专区:每次「换一批」生成几篇</label>
            <select id="set-fic-ratio">
              <option value="1" ${(d.ficRatio | 0) === 1 ? 'selected' : ''}>1 篇(最长最展开)</option>
              <option value="2" ${![1, 3].includes(d.ficRatio | 0) ? 'selected' : ''}>2 篇(推荐)</option>
              <option value="3" ${(d.ficRatio | 0) === 3 ? 'selected' : ''}>3 篇</option>
            </select>
            <div class="xhs-set-help" style="margin-top:4px">篇数越少,每篇能写得越长、越能展开成完整故事。</div>
          </div>
          <div class="xhs-pub-row">
            <label>同人文专区:每篇字数(每篇大约)</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input id="set-fic-wmin" type="number" min="50" max="4000" step="50" value="${(d.ficWordMin | 0) || 600}" style="flex:1;min-width:0"/>
              <span style="color:#999">~</span>
              <input id="set-fic-wmax" type="number" min="100" max="4000" step="50" value="${(d.ficWordMax | 0) || 1000}" style="flex:1;min-width:0"/>
              <span style="color:#999;white-space:nowrap">字</span>
            </div>
            <div class="xhs-set-help" style="margin:4px 0 0">专区每篇就照这个区间写(软约束,偶尔略超)。默认 600~1000,想更长就调大(如 1200~2500),想短点也行。配合上面"每次几篇"——篇数越少越能写长。</div>
          </div>
          <div class="xhs-pub-row">
            <label>② 同人文偏好(CP/题材/tag,逗号或换行分隔)</label>
            <textarea id="set-ficprefs" rows="2" placeholder="例如:骨科、酸涩、破镜重圆、暗恋脑、ABO、HE、背德">${esc(d.ficPrefs || '')}</textarea>
            <div class="xhs-set-help" style="margin:4px 0 0">留空就沿用上面的"首页内容偏好"。</div>
          </div>
          <div class="xhs-pub-row">
            <label>③ 同人文梗 / 桥段池</label>
            <textarea id="set-ficmemes" rows="4" placeholder="一行一个梗/桥段/设定,越多越不重样,例如:&#10;雨夜借伞,伞却往对方那边偏&#10;装醉试探,清醒后装失忆&#10;替身梗,后来发现喜欢的是本人&#10;假戏真做的契约恋爱&#10;失忆后只记得对方一个人">${esc(d.ficMemes || '')}</textarea>
            <div class="xhs-set-help" style="margin:4px 0 0">每次生成同人文会从这里随机抽几个当灵感,并强制别老用同几个套路。可以一直往里加。</div>
          </div>
          <div class="xhs-pub-row">
            <label>④ 同人文体裁(勾选想要的,会随机轮用)</label>
            <label class="xhs-set-check"><input type="checkbox" id="set-ficfmt-prose" ${(!Array.isArray(d.ficFormats) || d.ficFormats.includes('prose')) ? 'checked' : ''}/> 普通短文(小说式)</label>
            <label class="xhs-set-check"><input type="checkbox" id="set-ficfmt-letter" ${(Array.isArray(d.ficFormats) && d.ficFormats.includes('letter')) ? 'checked' : ''}/> 书信体(情书/往来书信)</label>
            <label class="xhs-set-check"><input type="checkbox" id="set-ficfmt-diary" ${(Array.isArray(d.ficFormats) && d.ficFormats.includes('diary')) ? 'checked' : ''}/> 日记体</label>
            <label class="xhs-set-check"><input type="checkbox" id="set-ficfmt-qa100" ${(Array.isArray(d.ficFormats) && d.ficFormats.includes('qa100')) ? 'checked' : ''}/> CP相性100问(问答体)</label>
            <label class="xhs-set-check"><input type="checkbox" id="set-ficfmt-chat" ${(!Array.isArray(d.ficFormats) || d.ficFormats.includes('chat')) ? 'checked' : ''}/> 微信聊天体(恋爱日记+聊天截图)</label>
            <div class="xhs-set-help" style="margin:4px 0 0">勾几个就在这几个里随机轮换;一个都不勾默认普通短文。</div>
          </div>
          <div class="xhs-pub-row">
            <label>同人文主角</label>
            <select id="set-fic-chars">
              <option value="random" ${d.ficChars === 'random' ? 'selected' : ''}>随机虚构路人 CP(陌生人,跟你世界书无关)</option>
              <option value="uchar" ${d.ficChars === 'uchar' ? 'selected' : ''}>嗑我和 char(${esc(getCharName())})</option>
            </select>
          </div>
          <div class="xhs-pub-row">
            <label>同人文文风偏好(想要的笔风,正向描述)</label>
            <textarea id="set-styleref" rows="2" placeholder="例如:克制、生活化、少形容词堆砌、多用对话推进、留白、别油腻">${esc(d.styleRef || '')}</textarea>
            <div class="xhs-set-help" style="margin:4px 0 0">只作用于<b>同人文长文</b>。</div>
          </div>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">🕐 剧情时间</summary>
          <label class="xhs-set-check">
            <input id="set-use-story-time" type="checkbox" ${d.useStoryTime ? 'checked' : ''}/>
            时间按剧情走(帖子/评论/微信/群聊显示剧情时间;主界面时钟仍现实时间)
          </label>
          <div class="xhs-set-help">开启后,每次刷帖/和 ta 私聊/回评论时,会顺手从剧情上下文里读出"当前剧情时间"并套用到所有内容。读不准时可在下面手动改。</div>
          <div class="xhs-pub-row" style="margin-top:8px">
            <label>当前剧情时间(自动读到: ${esc(d.storyTimeAuto || '—')})</label>
            <input id="set-story-time" placeholder="留空=用自动读到的;手动填如 5月20日 周五 19:30" value="${esc(d.storyTimeManual || '')}"/>
          </div>
          <button class="xhs-gen-btn" style="background:#ffe3ea;color:#c2185b;margin-top:8px" data-action="read-story-time">🕐 现在就从剧情读取时间</button>
        </details>

        <details class="xhs-set-section">
          <summary class="xhs-set-title">⚙ 其他</summary>
          <label class="xhs-set-check">
            <input id="set-sync-main" type="checkbox" ${d.syncToMain ? 'checked' : ''}/>
            同步到主对话(发帖/评论/群聊会注入主剧情)
          </label>
          <label class="xhs-set-check">
            <input id="set-sync-hidden" type="checkbox" ${d.syncHidden ? 'checked' : ''}/>
            同步消息隐藏(AI 看得见但你看不见)
          </label>
          <button class="xhs-gen-btn" style="background:#e6e6e6;color:#555;margin-top:10px" data-action="clear-feed">🗑 清空首页生成的帖子(不影响我自己发的)</button>
          <button class="xhs-gen-btn" style="background:#e6e6e6;color:#555;margin-top:8px" data-action="reset-xhs">♻ 一键重置(清空所有帖子/评论/群聊,保留设置与资料)</button>
        </details>

        <div style="height:40px"></div>
      </div>
    `;
  }

  async function saveSettings() {
    const TOP = getTop();
    const doc = TOP.document;
    const d = loadData();
    const has = (id) => !!doc.getElementById(id);
    const chk = (id) => doc.getElementById(id).checked;
    // 只更新"当前页面上确实存在"的字段,避免在另一个设置页保存时把看不见的字段清空
    if (has('set-use-main')) d.api.useMainApi = !!chk('set-use-main');
    if (has('set-url')) d.api.apiurl = (readInputCache('set-url') || '').trim();
    if (has('set-key')) d.api.key = (readInputCache('set-key') || '').trim();
    if (has('set-model')) d.api.model = (readInputCache('set-model') || '').trim();
    if (has('set-user-name')) d.userName = (readInputCache('set-user-name') || '我').trim() || '我';
    if (has('set-ctx-msgs')) d.contextMessages = Math.max(5, Math.min(100, parseInt(readInputCache('set-ctx-msgs')) || 30));
    if (has('set-memes')) d.memes = (readInputCache('set-memes') || '').trim().slice(0, 12000);
    if (has('set-tone')) d.platformTone = (readInputCache('set-tone') || '').trim().slice(0, 2000);
    if (has('set-xhsnpc')) d.xhsNpcStyle = (readInputCache('set-xhsnpc') || '').trim().slice(0, 12000);
    if (has('set-prefs')) d.feedPrefs = (readInputCache('set-prefs') || '').trim().slice(0, 600);
    if (has('set-ficprefs')) d.ficPrefs = (readInputCache('set-ficprefs') || '').trim().slice(0, 600);
    if (has('set-ficmemes')) d.ficMemes = (readInputCache('set-ficmemes') || '').trim().slice(0, 2000);
    if (has('set-ficfmt-prose')) {
      const fmts = [];
      ['prose', 'letter', 'diary', 'qa100', 'chat'].forEach(k => { if (chk('set-ficfmt-' + k)) fmts.push(k); });
      d.ficFormats = fmts.length ? fmts : ['prose'];
    }
    if (has('set-styleref')) d.styleRef = (readInputCache('set-styleref') || '').trim().slice(0, 1500);
    if (has('set-banwords')) d.banWords = (readInputCache('set-banwords') || '').trim().slice(0, 6000);
    if (has('set-boss-killer')) d.bossKiller = !!chk('set-boss-killer');
    if (has('set-fic-ratio')) d.ficRatio = parseInt(doc.getElementById('set-fic-ratio').value) || 0;
    if (has('set-fic-wmin')) {
      let mn = parseInt(doc.getElementById('set-fic-wmin').value) || 600;
      let mx = parseInt(doc.getElementById('set-fic-wmax').value) || 1000;
      mn = Math.max(50, Math.min(4000, mn));
      mx = Math.max(mn + 50, Math.min(4000, mx));
      d.ficWordMin = mn; d.ficWordMax = mx;
    }
    if (has('set-fic-chars')) d.ficChars = doc.getElementById('set-fic-chars').value || 'random';
    if (has('set-charname')) {
      const oldCN = charDisplayName(d);
      d.charName = (readInputCache('set-charname') || '').trim().slice(0, 30);
      const newCN = charDisplayName(d);
      if (oldCN && newCN && oldCN !== newCN) migrateCharName(d, oldCN, newCN);
    }
    if (has('set-charavatar')) d.charAvatar = (readInputCache('set-charavatar') || '').trim().slice(0, 500);
    if (has('set-charbg')) d.charProfileBg = (readInputCache('set-charbg') || '').trim().slice(0, 500);
    if (has('set-char-xhs-persona')) d.charXhsPersona = (readInputCache('set-char-xhs-persona') || '').trim().slice(0, 800);
    if (has('set-char-sees')) d.charSeesPosts = !!chk('set-char-sees');
    if (has('set-char-knows')) d.charKnowsAlt = doc.getElementById('set-char-knows').value === 'knows' ? 'knows' : 'unknown';
    if (has('set-char-lurk')) d.charLurk = !!chk('set-char-lurk');
    if (d.charKnowsAlt !== 'knows') d.charLurk = false; // 潜伏只在「知道」下成立,不知道时强制关闭
    if (has('set-lurk-thoughts')) d.lurkThoughts = !!chk('set-lurk-thoughts');
    if (d.charLurk && !d.charLurkAlias) d.charLurkAlias = genLurkAlias();
    if (has('set-susp-sens')) d.suspSensitivity = doc.getElementById('set-susp-sens').value || 'slow';
    if (has('set-susp-auto')) d.suspAutoReveal = !!chk('set-susp-auto');
    if (has('set-stickers')) {
      const rawStk = (readInputCache('set-stickers') || '');
      const stkLines = rawStk.split(/\n+/).map(l => l.trim()).filter(Boolean);
      d.stickers = stkLines.map(line => {
        const i = Math.min(...['：', ':', '|'].map(c => { const x = line.indexOf(c); return x < 0 ? Infinity : x; }));
        if (!isFinite(i)) return null;
        const name = line.slice(0, i).trim();
        const url = line.slice(i + 1).trim();
        return (name && /^https?:\/\//i.test(url)) ? { name, url } : null;
      }).filter(Boolean).slice(0, 200);
      if (stkLines.length && d.stickers.length < stkLines.length) {
        const skipped = stkLines.length - d.stickers.length;
        setTimeout(() => toastr.warning(`表情包:已存 ${d.stickers.length} 个,有 ${skipped} 行没认出——每行要写成「名字：链接」、链接以 http 开头${stkLines.length > 200 ? ';且上限 200 个' : ''}`, '', { timeOut: 6000 }), 150);
      }
    }
    if (has('set-sync-main')) { d.syncToMain = !!chk('set-sync-main'); }
    if (has('set-sync-hidden')) d.syncHidden = !!chk('set-sync-hidden');
    if (has('set-use-story-time')) d.useStoryTime = !!chk('set-use-story-time');
    if (has('set-story-time')) d.storyTimeManual = (readInputCache('set-story-time') || '').trim().slice(0, 40);
    // 手机通用:主页背景 / 气泡颜色
    if (has('set-extra-prompt')) d.extraPrompt = (readInputCache('set-extra-prompt') || '').trim().slice(0, 4000);
    if (has('set-chatstyle')) d.chatStyle = (readInputCache('set-chatstyle') || '').trim().slice(0, 4000);
    if (has('set-cpappicon')) { d.charPhoneAppIcon = (readInputCache('set-cpappicon') || '').trim(); }
    if (has('set-charphone-bg')) { d.charPhoneBg = (readInputCache('set-charphone-bg') || '').trim(); }
    if (has('set-cplockbg')) { d.charPhoneLockBg = (readInputCache('set-cplockbg') || '').trim(); }
    if (has('set-cp-darktext')) { d.charPhoneTextColor = chk('set-cp-darktext') ? 'dark' : 'light'; }
    if (has('set-cpicon-wx')) { d.charPhoneIcons = Object.assign({}, d.charPhoneIcons, { wx: (readInputCache('set-cpicon-wx') || '').trim(), notes: (readInputCache('set-cpicon-notes') || '').trim(), safari: (readInputCache('set-cpicon-safari') || '').trim(), music: (readInputCache('set-cpicon-music') || '').trim(), taobao: (readInputCache('set-cpicon-taobao') || '').trim(), alipay: (readInputCache('set-cpicon-alipay') || '').trim(), doubao: (readInputCache('set-cpicon-doubao') || '').trim(), poop: (readInputCache('set-cpicon-poop') || '').trim() }); }
    if (has('set-home-bgurl')) {
      const u = (readInputCache('set-home-bgurl') || '').trim();
      if (u) d.homeBg = `center/cover no-repeat url("${u.replace(/"/g, '')}")`;
      else if (d.homeBg && d.homeBg.indexOf('url(') >= 0) d.homeBg = ''; // 清空图片→回到渐变
    }
    if (has('set-bubble-me')) d.bubbleMe = doc.getElementById('set-bubble-me').value || '';
    if (has('set-home-text')) d.homeText = doc.getElementById('set-home-text').value || '#ffffff';
    if (has('set-bubble-other')) d.bubbleOther = doc.getElementById('set-bubble-other').value || '';
    if (has('set-icon-xhs') || has('set-icon-wx') || has('set-icon-set')) {
      d.appIcons = d.appIcons || {};
      if (has('set-icon-xhs')) d.appIcons.xhs = (readInputCache('set-icon-xhs') || '').trim().slice(0, 500);
      if (has('set-icon-wx')) d.appIcons.wx = (readInputCache('set-icon-wx') || '').trim().slice(0, 500);
      if (has('set-icon-set')) d.appIcons.set = (readInputCache('set-icon-set') || '').trim().slice(0, 500);
    }
    if (has('set-charm-off')) d.charmOff = !!chk('set-charm-off');
    if (has('set-charm-img')) d.charmImg = (readInputCache('set-charm-img') || '').trim().slice(0, 500);
    if (has('set-charm-img2')) d.charmImg2 = (readInputCache('set-charm-img2') || '').trim().slice(0, 500);
    await saveData(d);
    toastr.success('✓ 已保存');
    updateCharm();
    pushXhsDirective();
    refreshXhs();
  }

  // 拉取副 API 的可用模型,填充下拉框
  async function fetchModels() {
    const url = (readInputCache('set-url') || '').trim();
    const key = (readInputCache('set-key') || '').trim();
    const TOP = getTop();
    const hint = TOP.document.getElementById('set-model-hint');
    const sel = TOP.document.getElementById('set-model-select');
    if (!url) {
      toastr.error('请先填写上面的 API URL 再拉取');
      return;
    }
    if (typeof getModelList !== 'function') {
      toastr.error('酒馆助手版本过旧,没有 getModelList,请更新酒馆助手');
      return;
    }
    if (hint) hint.textContent = '拉取中…';
    try {
      const models = await getModelList({ apiurl: url, key: key || undefined });
      if (!Array.isArray(models) || models.length === 0) {
        if (hint) hint.textContent = '没拉到模型,检查 URL / Key 是否正确';
        toastr.warning('没拉到模型');
        return;
      }
      if (sel) {
        const cur = (readInputCache('set-model') || '').trim();
        sel.innerHTML = '<option value="">— 选择一个模型 —</option>'
          + models.map(m => `<option value="${esc(m)}" ${m === cur ? 'selected' : ''}>${esc(m)}</option>`).join('');
        sel.style.display = 'block';
      }
      if (hint) hint.textContent = `拉到 ${models.length} 个模型,从下拉里选一个`;
      toastr.success(`✓ ${models.length} 个模型`);
    } catch (e) {
      console.error('[XHS] getModelList error', e);
      if (hint) hint.textContent = '拉取失败: ' + (e.message || e);
      toastr.error('拉取失败: ' + (e.message || e));
    }
  }

  // ============ 弹层 ============
  function openXhs() {
    const TOP = getTop();
    const doc = TOP.document;
    injectCSS();
    // 总是重建:删掉可能残留的旧浮窗(旧浮窗的点击事件常因 iframe 重载而失效,导致"点不动")
    try { if (TOP.__xhsClockTimer) { clearInterval(TOP.__xhsClockTimer); TOP.__xhsClockTimer = null; } } catch (e) {}
    try { const $t = getTopJQ(); if ($t) $t(doc).off('.xhs'); } catch (e) {}
    const oldFloat = doc.getElementById('xhs-float'); if (oldFloat && oldFloat.parentNode) oldFloat.parentNode.removeChild(oldFloat);
    const oldFab = doc.getElementById('xhs-fab'); if (oldFab && oldFab.parentNode) oldFab.parentNode.removeChild(oldFab);
    const d = loadData();
    let float = doc.createElement('div');
    let fab = null;
    float.id = 'xhs-float';
    float.innerHTML = `
      <div id="xhs-frame">
        <div class="xhs-statusbar" id="xhs-drag">
          <span class="xhs-sb-grip"></span>
          <span class="xhs-sb-right">
            <button class="xhs-sb-btn" id="xhs-home" title="桌面" data-action="go-home">⌂</button>
            <button class="xhs-sb-btn" id="xhs-close" title="关闭" data-action="close-phone">✕</button>
          </span>
        </div>
        <div class="xhs-body" id="xhs-body">${renderBody(d)}</div>
      </div>
      <div id="xhs-charm" class="xhs-charm">${charmInner(d)}</div>`;
    doc.body.appendChild(float);
    if (!fab) {
      fab = doc.createElement('div');
      fab.id = 'xhs-fab';
      fab.textContent = '📕';
      fab.style.display = 'none';
      doc.body.appendChild(fab);
    }
    // 初始居中靠上
    requestAnimationFrame(() => {
      const w = float.offsetWidth, h = float.offsetHeight;
      const vw = TOP.innerWidth, vh = TOP.innerHeight;
      float.style.left = Math.max(6, (vw - w) / 2) + 'px';
      float.style.top = Math.max(8, (vh - h) / 2 * 0.5) + 'px';
    });
    bindEvents();
    bindPhoneChrome(doc, float, fab);
    updateXhsClock();
    updateXhsBattery();
    try { const lb = doc.getElementById('xhs-float-btn'); if (lb) lb.style.display = 'none'; } catch (e) {}
  }

  function charmInner(d) {
    if (d.charmOff) return '';
    const img = d.charmImg;
    const body = img
      ? `<img class="xhs-charm-img" src="${esc(img)}" onerror="this.style.display='none'"/>`
      : `<span class="xhs-charm-emoji">🧸</span>`;
    return `<span class="xhs-charm-ring"></span><span class="xhs-charm-chain"></span>${body}`;
  }
  function charm2Inner(d) {
    const img = d.charmImg2;
    const body = img
      ? `<img class="xhs-charm-img xhs-charm2-body" src="${esc(img)}" onerror="this.style.display='none'"/>`
      : `<span class="xhs-charm-emoji xhs-charm2-body">🎀</span>`;
    return `<span class="xhs-charm-ring"></span><span class="xhs-charm-chain xhs-charm-chain-long"></span>${body}`;
  }
  function updateCharm() {
    const TOP = getTop();
    const d = loadData();
    const el = TOP.document.getElementById('xhs-charm');
    if (el) el.innerHTML = charmInner(d);
    const el2 = TOP.document.getElementById('xhs-charm2');
    if (el2) el2.innerHTML = charm2Inner(d);
  }
  function updateXhsClock() {
    const TOP = getTop();
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const el = TOP.document.getElementById('xhs-sb-time');
    if (el) el.textContent = hhmm;
    const hel = TOP.document.getElementById('xhs-home-time');
    if (hel) hel.textContent = hhmm;
  }
  function updateXhsBattery() {
    const TOP = getTop();
    const el = TOP.document.getElementById('xhs-sb-batt');
    if (!el) return;
    try {
      if (TOP.navigator && TOP.navigator.getBattery) {
        TOP.navigator.getBattery().then(b => { el.textContent = Math.round(b.level * 100); });
      }
    } catch (e) {}
  }

  // 拖动 / 缩小 / 关闭 / 时钟
  function bindPhoneChrome(doc, float, fab) {
    const TOP = getTop();
    // 时钟每 30s 刷新
    try { if (TOP.__xhsClockTimer) clearInterval(TOP.__xhsClockTimer); } catch (e) {}
    TOP.__xhsClockTimer = setInterval(updateXhsClock, 30000);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const makeDraggable = (handle, target, onTap) => {
      let sx, sy, ox, oy, moved, dragging = false;
      const down = (e) => {
        // 点状态栏上的按钮(桌面/缩小/关闭)时不触发拖动
        if (e.target && e.target.closest && e.target.closest('.xhs-sb-btn')) return;
        const t = e.touches ? e.touches[0] : e;
        dragging = true; moved = false;
        sx = t.clientX; sy = t.clientY;
        const r = target.getBoundingClientRect();
        ox = r.left; oy = r.top;
        doc.addEventListener('mousemove', move, { passive: false });
        doc.addEventListener('touchmove', move, { passive: false });
        doc.addEventListener('mouseup', up);
        doc.addEventListener('touchend', up);
        doc.addEventListener('touchcancel', up);
        try { TOP.addEventListener('blur', up); } catch (e) {}
      };
      const move = (e) => {
        if (!dragging) return;
        const t = e.touches ? e.touches[0] : e;
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (e.cancelable) e.preventDefault();
        const w = target.offsetWidth, h = target.offsetHeight;
        target.style.left = clamp(ox + dx, 4, TOP.innerWidth - w - 4) + 'px';
        target.style.top = clamp(oy + dy, 4, TOP.innerHeight - h - 4) + 'px';
        target.style.right = 'auto'; target.style.bottom = 'auto';
      };
      const up = () => {
        dragging = false;
        doc.removeEventListener('mousemove', move);
        doc.removeEventListener('touchmove', move);
        doc.removeEventListener('mouseup', up);
        doc.removeEventListener('touchend', up);
        doc.removeEventListener('touchcancel', up);
        try { TOP.removeEventListener('blur', up); } catch (e) {}
        if (!moved && onTap) onTap();
      };
      handle.addEventListener('mousedown', down);
      handle.addEventListener('touchstart', down, { passive: true });
    };

    const drag = doc.getElementById('xhs-drag');
    if (drag) makeDraggable(drag, float, null);
    makeDraggable(fab, fab, () => { // 点 FAB(没拖动)→ 还原
      float.style.display = 'block'; fab.style.display = 'none'; refreshXhs(); updateXhsClock();
    });

    const homeBtn = doc.getElementById('xhs-home');
    if (homeBtn) homeBtn.addEventListener('click', (e) => { e.stopPropagation(); goHome(); });
    const minBtn = doc.getElementById('xhs-min');
    if (minBtn) minBtn.addEventListener('click', (e) => { e.stopPropagation(); minimizeXhs(); });
    const closeBtn = doc.getElementById('xhs-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeXhs(); });

    // 终极保险:在 TOP 文档上挂一个捕获阶段、永不被移除的监听,专门兜底 桌面/缩小/关闭
    // 即使委托或上面的直接监听因任何原因失效,这个也能让你关掉手机
    if (!TOP.__xhsChromeEscape) {
      TOP.__xhsChromeEscape = function (e) {
        const t = e.target && e.target.closest ? e.target.closest('#xhs-home,#xhs-min,#xhs-close') : null;
        if (!t) return;
        e.stopPropagation();
        if (t.id === 'xhs-close') closeXhs();
        else if (t.id === 'xhs-min') minimizeXhs();
        else goHome();
      };
      doc.addEventListener('click', TOP.__xhsChromeEscape, true);
    }
  }

  function minimizeXhs() {
    const TOP = getTop();
    const doc = TOP.document;
    const float = doc.getElementById('xhs-float');
    const fab = doc.getElementById('xhs-fab');
    if (float) float.style.display = 'none';
    if (fab) fab.style.display = 'flex';
  }

  function closeXhs() {
    const TOP = getTop();
    const doc = TOP.document;
    try { if (TOP.__xhsClockTimer) { clearInterval(TOP.__xhsClockTimer); TOP.__xhsClockTimer = null; } } catch (e) {}
    try { const $top = getTopJQ(); if ($top) $top(doc).off('.xhs'); } catch (e) {}
    const float = doc.getElementById('xhs-float');
    const fab = doc.getElementById('xhs-fab');
    if (float && float.parentNode) float.parentNode.removeChild(float);
    if (fab && fab.parentNode) fab.parentNode.removeChild(fab);
    try { ensureFab(false); const lb = doc.getElementById('xhs-float-btn'); if (lb) lb.style.display = 'flex'; } catch (e) {}
  }

  // 创建/确保常驻悬浮启动按钮存在(可拖动+记住位置+点击打开)。force=true 强制重建(新一次脚本运行用,刷新事件绑定)。
  // 手机端脚本加载早、body 可能尚未就绪,本函数在 body 没好时安全返回 false,由加载段的多次重试补建。
  function ensureFab(force) {
    try {
      const TOP = getTop();
      const doc = TOP.document;
      if (!doc || !doc.body) return false;
      const ex = doc.getElementById('xhs-float-btn');
      if (ex && !force) return true;
      if (ex && ex.parentNode) ex.parentNode.removeChild(ex);
      const btn = doc.createElement('button');
      btn.id = 'xhs-float-btn';
      btn.textContent = '📱';
      btn.title = '打开芋圆机(可拖动)';
      btn.style.cssText = 'position:fixed!important;width:50px;height:50px;border-radius:50%;background:#ff2442;color:#fff;font-size:24px;border:none;cursor:grab;z-index:2000000000!important;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;line-height:1;padding:0;touch-action:none;-webkit-user-select:none;user-select:none;';
      let savedPos = null;
      try { savedPos = JSON.parse(TOP.localStorage.getItem('xhs_yuyuan_fab_pos') || 'null'); } catch (e) {}
      if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
        btn.style.left = Math.min(Math.max(4, savedPos.left), TOP.innerWidth - 54) + 'px';
        btn.style.top = Math.min(Math.max(4, savedPos.top), TOP.innerHeight - 54) + 'px';
        btn.style.right = 'auto'; btn.style.bottom = 'auto';
      } else {
        btn.style.right = '16px'; btn.style.bottom = '90px';
      }
      try { if (doc.getElementById('xhs-float')) btn.style.display = 'none'; } catch (e) {}
      doc.body.appendChild(btn);
      let sx, sy, ox, oy, moved = false, dragging = false;
      const clmp = (v, a, b) => Math.min(Math.max(v, a), b);
      const onMove = (e) => {
        if (!dragging) return;
        const t = e.touches ? e.touches[0] : e;
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (e.cancelable) e.preventDefault();
        const w = btn.offsetWidth, h = btn.offsetHeight;
        btn.style.left = clmp(ox + dx, 4, TOP.innerWidth - w - 4) + 'px';
        btn.style.top = clmp(oy + dy, 4, TOP.innerHeight - h - 4) + 'px';
        btn.style.right = 'auto'; btn.style.bottom = 'auto';
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false; btn.style.cursor = 'grab';
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('touchmove', onMove);
        doc.removeEventListener('mouseup', onUp);
        doc.removeEventListener('touchend', onUp);
        doc.removeEventListener('touchcancel', onUp);
        if (moved) {
          const r = btn.getBoundingClientRect();
          try { TOP.localStorage.setItem('xhs_yuyuan_fab_pos', JSON.stringify({ left: r.left, top: r.top })); } catch (e) {}
        } else {
          try { openXhs(); } catch (e) { try { toastr.error('打开失败: ' + e.message); } catch (e2) {} }
        }
      };
      const onDown = (e) => {
        dragging = true; moved = false; btn.style.cursor = 'grabbing';
        const t = e.touches ? e.touches[0] : e;
        sx = t.clientX; sy = t.clientY;
        const r = btn.getBoundingClientRect();
        ox = r.left; oy = r.top;
        doc.addEventListener('mousemove', onMove, { passive: false });
        doc.addEventListener('touchmove', onMove, { passive: false });
        doc.addEventListener('mouseup', onUp);
        doc.addEventListener('touchend', onUp);
        doc.addEventListener('touchcancel', onUp);
      };
      btn.addEventListener('mousedown', onDown);
      btn.addEventListener('touchstart', onDown, { passive: true });
      return true;
    } catch (e) { return false; }
  }

  function refreshXhs() {
    const TOP = getTop();
    const $top = getTopJQ();
    if (!$top) return;
    const body = $top('#xhs-body', TOP.document);
    if (body.length === 0) return;
    // 记录可滚动区位置,渲染后还原(点赞/展开不跳顶);聊天框则滚到底显示最新
    const doc = TOP.document;
    const scrollers = ['.xhs-scroll', '.xhs-view-scroll'];
    const saved = {};
    scrollers.forEach(sel => {
      const el = body[0].querySelector(sel);
      if (el) saved[sel] = el.scrollTop;
    });
    // 多选/删除模式下,聊天区不要自动滚到底(否则每勾选一条就跳走),记下当前位置渲染后还原
    const chatEl0 = body[0].querySelector('.xhs-grp-chat');
    const savedChatTop = chatEl0 ? chatEl0.scrollTop : null;
    // 保留设置页各折叠区(details)的展开状态,否则重渲染会把它们全收起、页面变短、滚动跳回顶部
    const openSecs = [];
    body[0].querySelectorAll('details.xhs-set-section').forEach((el, i) => { if (el.open) openSecs.push(i); });
    const d = loadData();
    const keepChatPos = !!(d.routeContext && (d.routeContext.wxSelect || d.routeContext.delSelMode || d.routeContext.delIdx != null));
    try {
      body.html(renderBody(d));
      if (openSecs.length) {
        const secs = body[0].querySelectorAll('details.xhs-set-section');
        openSecs.forEach(i => { if (secs[i]) secs[i].open = true; });
      }
    } catch (err) {
      console.error('[XHS] render error', err);
      try {
        body.html('<div style="padding:30px;text-align:center;color:#888;font-size:14px">页面渲染出错了 😵<br/><br/><button data-action="go-home" style="padding:8px 18px;border:none;border-radius:18px;background:#ff2442;color:#fff;font-size:14px">返回桌面</button> <button data-action="refresh-feed" style="padding:8px 18px;border:none;border-radius:18px;background:#eee;font-size:14px;margin-top:8px">重试</button><br/><br/><span style="font-size:12px;color:#bbb">点右上角 ✕ 也可关闭</span></div>');
      } catch (e2) {}
      try { toastr.error('页面出错,已显示返回入口'); } catch (e3) {}
      return;
    }
    const raf = TOP.requestAnimationFrame || window.requestAnimationFrame || (fn => setTimeout(fn, 16));
    raf(() => {
      scrollers.forEach(sel => {
        if (saved[sel] == null) return;
        const el = body[0].querySelector(sel);
        if (el) el.scrollTop = saved[sel];
      });
      // 聊天框:正常聊天滚到底看最新;多选/删除时保持原位,不回弹
      const chat = body[0].querySelector('.xhs-grp-chat');
      if (chat) {
        if (keepChatPos && savedChatTop != null) chat.scrollTop = savedChatTop;
        else chat.scrollTop = chat.scrollHeight;
      }
      updateXhsClock();
    });
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    const TOP = getTop();
    const $top = getTopJQ();
    const $doc = $top(TOP.document);

    $doc.off('.xhs');

    // 输入缓存
    $doc.on('input.xhs', '#xhs-float input[id^="set-"], #xhs-float input[id^="xhs-"], #xhs-float textarea[id^="xhs-"]', function () {
      TOP.__xhsInputs = TOP.__xhsInputs || {};
      TOP.__xhsInputs[this.id] = this.value || '';
    });

    // 双击聊天消息 → 显示/隐藏"删除这条"按钮
    $doc.on('dblclick.xhs', '#xhs-float .xhs-cmsg[data-msgidx], #xhs-float .xhs-heart-row[data-msgidx]', async function (e) {
      e.preventDefault(); e.stopPropagation();
      const idx = parseInt($top(this).data('msgidx'));
      if (isNaN(idx)) return;
      const d = loadData();
      d.routeContext.delIdx = (d.routeContext.delIdx === idx) ? null : idx;
      await saveData(d);
      refreshXhs();
    });

    // 双击评论 → 弹"删除/多选"小菜单
    $doc.on('dblclick.xhs', '#xhs-float .xhs-c-item[data-cid]', async function (e) {
      e.preventDefault(); e.stopPropagation();
      const cid = $top(this).data('cid');
      if (!cid) return;
      const d = loadData();
      if (d.routeContext.cmtSelMode) return; // 多选模式里双击不弹菜单
      d.routeContext.cmtMenuCid = (d.routeContext.cmtMenuCid === cid) ? null : cid;
      await saveData(d);
      refreshXhs();
    });

    $doc.on('click.xhs', '#xhs-float [data-action]', async function (e) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const $btn = $top(this);
        const action = $btn.data('action');
        const id = $btn.data('id');
        const route = $btn.data('route');
        const cat = $btn.data('cat');
        const dest = $btn.data('dest');
        const app = $btn.data('app');
        const cid = $btn.data('cid');

        switch (action) {
          case 'nav': await navigate(route, id ? { groupId: id, postId: id } : {}); break;
          case 'refresh-feed': {
            const _dd = loadData();
            if ((_dd.feedCat || 'rec') === 'fic') await genFicZone(); else await refreshFeed();
            break;
          }
          case 'feed-cat': {
            const _dd = loadData();
            _dd.feedCat = (cat === 'fic') ? 'fic' : 'rec';
            await saveData(_dd);
            refreshXhs();
            break;
          }
          case 'gen-fic-zone': await genFicZone(); break;
          case 'clear-fic-zone': {
            const TOPw = getTop();
            if (!(TOPw.confirm ? TOPw.confirm('清空同人文专区里所有已生成的同人文?(此操作不可撤销)') : confirm('清空同人文专区?'))) break;
            const _dd = loadData();
            _dd.ficFeed = [];
            await saveData(_dd);
            refreshXhs();
            toastr.success('已清空同人文专区');
            break;
          }
          case 'xhs-view': await openPostView(id); break;
          case 'view-back': await viewBack(); break;
          case 'open-npc-dm': await openNpcDm($btn.data('name')); break;
          case 'comment-send': await sendComment(id); break;
          case 'gen-comments': await generatePostComments(id); break;
          case 'regen-cmt-reply': await regenCommentReply(id, $btn.data('cid')); break;
          case 'do-publish': await doPublish(); break;
          case 'del-post': await deletePost(id); break;
          case 'edit-post-body': await editPostBody(id); break;
          case 'clear-feed': await clearFeed(); break;
          case 'reset-xhs': await resetXhsContent(); break;
          case 'group-menu': await toggleGroupMenu(); break;
          case 'clear-group-chat': await clearGroupChat(id); break;
          case 'dissolve-group': await dissolveGroup(id); break;
          case 'create-group': await createGroup(); break;
          case 'open-group': { const dd = loadData(); const gg = (dd.groups || []).find(x => x.id === id); if (gg) { gg.seenAt = Date.now(); dd.currentApp = gg.app === 'wx' ? 'wx' : 'xhs'; await saveData(dd); } await navigate('group-chat', { groupId: id }); break; }
          case 'wx-new-group': await navigate('wx-new-group', {}); break;
          case 'wx-group-pick': { const dd = loadData(); dd.routeContext.wxGroupSel = dd.routeContext.wxGroupSel || []; const i = dd.routeContext.wxGroupSel.indexOf(id); if (i >= 0) dd.routeContext.wxGroupSel.splice(i, 1); else dd.routeContext.wxGroupSel.push(id); await saveData(dd); refreshXhs(); break; }
          case 'wx-create-group': await wxCreateGroup(); break;
          case 'rename-group': await renameGroup(id); break;
          case 'set-group-avatar': await setGroupAvatar(id); break;
          case 'set-chat-bg': await setChatBg(id); break;
          case 'grp-send': await groupSend(id); break;
          case 'gen-group-reply': await genGroupReply(id); break;
          case 'toggle-attach': await toggleAttach(id); break;
          case 'attach-transfer': await attachTransfer($btn.data('kind'), id); break;
          case 'attach-image': await attachImage($btn.data('kind'), id); break;
          case 'attach-voice': await attachVoice($btn.data('kind'), id); break;
          case 'play-voice': await toggleVoice(id); break;
          case 'send-sticker': await sendSticker($btn.data('kind'), id, $btn.data('url'), $btn.data('name')); break;
          case 'boost-group': await boostGroupFromPost(id); break;
          case 'react-as-char': await reactAsChar(id); break;
          case 'char-reply-comments': await charReplyComments(id); break;
          case 'cast-react-open': await openCastReact(id); break;
          case 'cancel-cast-react': await cancelCastReact(); break;
          case 'cast-react-post': { const dd = loadData(); if (dd.routeContext) dd.routeContext.castReact = false; await saveData(dd); await reactAsCast(id, cid); break; }
          case 'cast-reply-comments': { const dd = loadData(); if (dd.routeContext) dd.routeContext.castReact = false; await saveData(dd); await castReplyComments(id, cid); break; }
          case 'reveal-alt': await revealAlt(); break;
          case 'reset-susp': await resetSusp(); break;
          case 'reveal-lurk': await revealLurk(); break;
          case 'import-char-alt': await importCharAlt(); break;
          case 'import-wx-char': await importWxCharMsgs(); break;
          case 'import-xhs-char': await importXhsCharMsgs(); break;
          case 'import-cast-msgs': await importCastMsgs($btn.data('id')); break;
          case 'set-char-alt': await setCharAlt(id, true); break;
          case 'unset-char-alt': await setCharAlt(id, false); break;
          case 'reveal-char-alt': await revealCharAlt(id); break;
          case 'toggle-char-alt-lurk': await toggleCharAltLurk(id); break;
          case 'gen-charbio': await genCharBio(); break;
          case 'gen-char-post': await genCharPost(); break;
          case 'set-char-avatar': await setCharAvatarP(); break;
          case 'set-char-bg': await setCharBgP(); break;
          case 'set-char-nick': await setCharNickP(); break;
          case 'dm-char': await dmChar(); break;
          case 'save-settings': await saveSettings(); break;
          case 'sync-char': await syncCharBinding(); break;
          case 'detect-cast': await detectCast(); break;
          case 'toggle-cand': await toggleCand($btn.data('idx')); break;
          case 'cand-all': await candSetAll(true); break;
          case 'cand-none': await candSetAll(false); break;
          case 'cand-add': await candAdd(); break;
          case 'cand-discard': await candDiscard(); break;
          case 'clear-cast': await clearCast(); break;
          case 'add-cast': await addCastMember(); break;
          case 'edit-cast-persona': await editCastPersona(id); break;
          case 'rename-cast': await renameCastMember(id); break;
          case 'set-cast-avatar': await setCastAvatar(id); break;
          case 'set-cast-bg': await setCastBg(id); break;
          case 'toggle-cast-lurk': await toggleCastLurk(id); break;
          case 'reveal-cast-lurk-name': await revealCastLurkName(id); break;
          case 'toggle-lurk-thoughts': await toggleLurkThoughts(); break;
          case 'toggle-cast-knows': await toggleCastKnows(id); break;
          case 'reveal-cast-knows': await revealCastKnows(id); break;
          case 'toggle-cast-panel': await toggleCastPanel(id); break;
          case 'cast-reset-susp': await castResetSusp(id); break;
          case 'cast-susp-sens': await setCastSuspSens(id); break;
          case 'import-cast-alt': await importCastAlt(id); break;
          case 'reveal-cast-alt': await revealCastAlt(id); break;
          case 'toggle-cast-alt-lurk': await toggleCastAltLurk(id); break;
          case 'unset-cast-alt': await unsetCastAlt(id); break;
          case 'toggle-alt-watch': await toggleAltWatch(id); break;
          case 'reveal-alt-watch': await revealAltWatch(id); break;
          case 'create-alt': await createAlt(); break;
          case 'del-cast': await delCastMember(id); break;
          case 'open-cast-wx': await openCastWxChat(id); break;
          case 'open-cast-xhs': await openCastXhsChat(id); break;
          case 'open-cast-profile': await openCastProfile(id); break;
          case 'gen-cast-post': await genCastPost(id); break;
          case 'gen-castbio': await genCastBio(id); break;
          case 'check-inject': {
            toastr.info('检测中…');
            const _role = getRoleDesc();
            const _world = getWorldSetting();
            const _wb = (await getWorldbookContent()) || '';
            const _plot = await buildContextSnippet();
            const _bind = loadData().charBinding;
            getTop().alert(
              '📱 小手机·注入自检\n\n' +
              `人设 role: ${_role ? _role.length + ' 字 ✓' : '⚠ 空!没读到'}\n` +
              `世界观 world: ${_world ? _world.length + ' 字 ✓' : '空(可能没设)'}\n` +
              `世界书 worldbook: ${_wb ? _wb.length + ' 字 ✓' : '⚠ 空!没读到'}\n` +
              `剧情快照 plot: ${_plot ? _plot.length + ' 字 ✓' : '空(可能没剧情/被关)'}\n\n` +
              (_bind ? `(当前用的是手动绑定的人设)` :
                ((!_role || !_wb) ? '人设或世界书读到了空。可能原因:角色卡的 description/性格没填、世界书没绑到角色卡或对话。可点上面「🔗 同步当前角色」手动绑定。' : '都读到了,char 会按这些来。'))
            );
            break;
          }
          case 'clear-char': await clearCharBinding(); break;
          case 'sum-story': await summarizeStory(); break;
          case 'clear-sum': await clearStorySummary(); break;
          case 'fetch-models': await fetchModels(); break;
          case 'like-comment': await likeComment(id, $btn.data('cid')); break;
          case 'like-post': await likePost(id); break;
          case 'comment-img': await commentAddImg(id); break;
          case 'clear-cimg': await clearCommentImg(); break;
          case 'comment-sticker-toggle': await commentStickerToggle(); break;
          case 'comment-pick-sticker': await pickCommentSticker($btn.data('url'), $btn.data('name')); break;
          case 'clear-csticker': await clearCommentSticker(); break;
          case 'reply-comment': await replyToComment(id, $btn.data('cid'), $btn.data('name')); break;
          case 'cancel-reply': await cancelReply(id); break;
          case 'open-dm': await openDm(id); break;
          case 'open-char-dm': await openCharDm(); break;
          case 'del-dm': await deleteDm(id); break;
          case 'dismiss-notif': await dismissNotif(id); break;
          case 'open-app': await openApp(app); break;
          case 'open-charphone': await openCharPhone(); break;
          case 'cp-open': await cpNav(route); if (route === 'cp-music') { const dm = loadData(); if (!dm.charPhoneMusic) genCharMusic(); } else if (route === 'cp-taobao') { const dm = loadData(); if (!dm.charPhoneTaobao) genCharTaobao(); } else if (route === 'cp-alipay') { const dm = loadData(); if (!dm.charPhoneAlipay) genCharAlipay(); } else if (route === 'cp-doubao') { const dm = loadData(); if (!dm.charPhoneDoubao) genCharDoubao(); } else if (route === 'cp-poop') { const dm = loadData(); if (!dm.charPhonePoop) genCharPoop(); } break;
          case 'cp-music-refresh': await genCharMusic(); break;
          case 'cp-tb-refresh': await genCharTaobao(); break;
          case 'cp-tb-orders': await cpNav('cp-tb-orders', { tbStatus: cat || null }); break;
          case 'cp-ali-refresh': await genCharAlipay(); break;
          case 'cp-doubao-refresh': await genCharDoubao(); break;
          case 'cp-poop-refresh': await genCharPoop(); break;
          case 'cp-ali-cat': { const dd = loadData(); dd.routeContext = dd.routeContext || {}; dd.routeContext.aliCat = cat || '全部'; await saveData(dd); refreshXhs(); break; }
          case 'cp-back': await cpNav(route); break;
          case 'cp-open-chat': await cpNav('cp-wx-chat', { cpChat: $btn.data('idx') }); break;
          case 'cp-note-open': await cpNav('cp-note', { cpNote: $btn.data('idx') }); break;
          case 'clear-cp-search': { const TP = getTop(); const dd = loadData(); if (dd.charPhone && (TP.confirm ? TP.confirm('清空 ta 的搜索记录?') : true)) { dd.charPhone.safari = []; dd.routeContext.cpSafari = null; await saveData(dd); refreshXhs(); } break; }
          case 'cp-refresh': await genCharPhone(); break;
          case 'cp-unlock': await cpNav('cp-home'); break;
          case 'cp-theme-export': {
            const dd = loadData();
            const theme = { app: 'yuyuan', type: 'charphone-theme', v: 1, icons: dd.charPhoneIcons || {}, appIcon: dd.charPhoneAppIcon || '', bg: dd.charPhoneBg || '', lockBg: dd.charPhoneLockBg || '', textColor: dd.charPhoneTextColor || 'light' };
            const str = JSON.stringify(theme);
            const out = getTop().document.getElementById('cp-theme-out');
            if (out) { out.value = str; try { out.select(); } catch (e) {} }
            try { (getTop().navigator.clipboard || navigator.clipboard).writeText(str); toastr.success('已生成并复制到剪贴板,直接粘给别人即可'); }
            catch (e) { toastr.success('已生成,手动复制下面框里的代码发给别人'); }
            break;
          }
          case 'cp-theme-import': {
            const el = getTop().document.getElementById('cp-theme-in');
            const txt = ((el && el.value) || '').trim();
            if (!txt) { toastr.warning('先把别人给的外观代码粘到框里'); break; }
            let obj = null; try { obj = JSON.parse(txt); } catch (e) {}
            if (!obj || obj.type !== 'charphone-theme') { toastr.error('代码不对,确认粘的是「外观代码」整段'); break; }
            const dd = loadData();
            if (obj.icons && typeof obj.icons === 'object') dd.charPhoneIcons = Object.assign({}, dd.charPhoneIcons, obj.icons);
            if (typeof obj.appIcon === 'string') dd.charPhoneAppIcon = obj.appIcon;
            if (typeof obj.bg === 'string') dd.charPhoneBg = obj.bg;
            if (typeof obj.lockBg === 'string') dd.charPhoneLockBg = obj.lockBg;
            if (obj.textColor === 'dark' || obj.textColor === 'light') dd.charPhoneTextColor = obj.textColor;
            await saveData(dd);
            refreshXhs();
            toastr.success('✓ 外观已导入并应用');
            break;
          }
          case 'cp-refresh-all': await genCharAll(); break;
          case 'cp-music-tab': { const dd = loadData(); dd.routeContext = dd.routeContext || {}; dd.routeContext.musicTab = cat || 'rec'; await saveData(dd); refreshXhs(); break; }
          case 'cp-safari-toggle': { const dd = loadData(); const ix = $btn.data('idx'); dd.routeContext.cpSafari = (String(dd.routeContext.cpSafari) === String(ix)) ? null : ix; await saveData(dd); refreshXhs(); break; }
          case 'go-home': await goHome(); break;
          case 'min-phone': minimizeXhs(); break;
          case 'close-phone': closeXhs(); break;
          case 'wx-add-menu': { const dd = loadData(); dd.routeContext.wxAddMenuOpen = !dd.routeContext.wxAddMenuOpen; await saveData(dd); refreshXhs(); break; }
          case 'wx-add': { const dd = loadData(); dd.routeContext.wxAddMenuOpen = false; await saveData(dd); await wxAddContact(); break; }
          case 'set-wx-name': await setWxName(); break;
          case 'set-wx-avatar': await setWxAvatar(); break;
          case 'set-wx-bio': await setWxBio(); break;
          case 'set-wx-remark': await setWxRemark(id); break;
          case 'set-dm-avatar': await setDmAvatar(id); break;
          case 'del-msg': await delChatMsg($btn.data('idx')); break;
          case 'msg-time': await editMsgTime($btn.data('idx')); break;
          case 'read-story-time': await extractStoryTime(); break;
          case 'del-comment': await delComment(id, $btn.data('cid')); break;
          case 'cmt-multi': await cmtMulti(id, $btn.data('cid')); break;
          case 'cmt-sel-toggle': await cmtSelToggle($btn.data('cid')); break;
          case 'cmt-sel-confirm': await cmtSelConfirm(id); break;
          case 'cmt-sel-cancel': await cmtSelCancel(); break;
          case 'msg-multi': await msgMulti($btn.data('idx')); break;
          case 'msg-quote': await msgQuote($btn.data('idx')); break;
          case 'quote-cancel': await quoteCancel(); break;
          case 'del-sel-toggle': await delSelToggle($btn.data('idx')); break;
          case 'del-sel-cancel': await delSelCancel(); break;
          case 'del-sel-confirm': await delSelConfirm($btn.data('id')); break;
          case 'del-sel-time': await delSelTime(); break;
          case 'wx-start-select': await startWxSelect(id); break;
          case 'wx-online-persona': await setWxOnline(id); break;
          case 'reveal-lurk-name': await revealLurkName(); break;
          case 'wx-sel-toggle': await wxSelToggle($btn.data('idx')); break;
          case 'wx-sel-cancel': await cancelWxSelect(); break;
          case 'wx-sel-publish': await wxShareToXhs(id); break;
          case 'set-wallpaper': await setWallpaper($btn.data('bg')); break;
          case 'export-theme': exportTheme(); break;
          case 'import-theme': await importTheme(); break;
          case 'open-notifs': await openNotifs(cat); break;
          case 'forward-post': await openForward(id); break;
          case 'cancel-forward': await cancelForward(); break;
          case 'do-forward': await doForward(id, dest); break;
          case 'dm-menu': await toggleDmMenu(); break;
          case 'clear-dm-chat': await clearDmChat(id); break;
          case 'dm-send': await dmSend(id); break;
          case 'gen-dm-reply': await genDmReply(id); break;
          case 'toggle-thread': await toggleThread(id, $btn.data('cid')); break;
          case 'edit-profile': await editProfile(); break;
          case 'market-disabled': toastr.info('市集暂未开放'); break;
          case 'open-user': await openUserProfile($btn.data('name')); break;
          case 'refresh-user': await refreshUserProfile($btn.data('name')); break;
          case 'set-pub-type': await setPubType($btn.data('name')); break;
          case 'set-chat-mode': await setChatMode($btn.data('name')); break;
          case 'set-chat-extract': await setChatExtract($btn.data('name')); break;
          case 'follow-user': await followUser($btn.data('name'), $btn.data('bio')); break;
          case 'unfollow-user': await unfollowUser($btn.data('name')); break;
        }
      } catch (err) {
        console.error('[XHS] action error', err);
        toastr.error('出错: ' + err.message);
      }
    });

    // 选模型下拉 → 写回模型输入框
    $doc.on('change.xhs', '#set-model-select', function () {
      const v = this.value || '';
      if (!v) return;
      const inp = getTop().document.getElementById('set-model');
      if (inp) inp.value = v;
      TOP.__xhsInputs = TOP.__xhsInputs || {};
      TOP.__xhsInputs['set-model'] = v;
    });

    // 「知道/不知道」下拉:实时切换下面的"怀疑识破"块 / "潜伏"块
    $doc.on('change.xhs', '#set-char-knows', function () {
      const knows = this.value === 'knows';
      const doc = getTop().document;
      const kb = doc.getElementById('xhs-knows-block');
      const ub = doc.getElementById('xhs-knows-unknown-block');
      if (kb) kb.style.display = knows ? 'block' : 'none';
      if (ub) ub.style.display = knows ? 'none' : 'block';
      // 切到「不知道」时,潜伏不允许存在 → 取消勾选(保存时也会强制 charLurk=false)
      if (!knows) { const lk = doc.getElementById('set-char-lurk'); if (lk) lk.checked = false; }
    });

    // 总开关「char 能刷到我的帖子」:关掉就把整组隐藏
    $doc.on('change.xhs', '#set-char-sees', function () {
      const body = getTop().document.getElementById('xhs-storylink-body');
      if (body) body.style.display = this.checked ? 'block' : 'none';
    });

    // 回车发送
    $doc.on('keydown.xhs', '#xhs-c-input, #xhs-grp-input, #xhs-dm-input', function (e) {
      TOP.__xhsInputs = TOP.__xhsInputs || {};
      TOP.__xhsInputs[this.id] = this.value || '';
      if (e.key === 'Enter') {
        e.preventDefault();
        const map = { 'xhs-c-input': 'comment-send', 'xhs-grp-input': 'grp-send', 'xhs-dm-input': 'dm-send' };
        const btn = TOP.document.querySelector(`[data-action="${map[this.id]}"]`);
        if (btn) btn.click();
      }
    });
  }

  // ============ CSS ============
  function injectCSS() {
    const TOP = getTop();
    const doc = TOP.document;
    const existing = doc.getElementById('xhs-style');
    if (existing) existing.remove();
    const style = doc.createElement('style');
    style.id = 'xhs-style';
    style.textContent = `
      #toast-container { z-index: 2147483647 !important; pointer-events: none !important; }
      #toast-container, #toast-container * { pointer-events: none !important; }
      #xhs-float {
        position: fixed; z-index: 2000000000;
        left: 50%; top: 24px;
      }
      .xhs-statusbar {
        flex: 0 0 24px; height: 24px; background: #111; color: #fff;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 12px; font-size: 12px; cursor: move; user-select: none;
        touch-action: none;
      }
      .xhs-sb-grip { flex: 1; height: 100%; }
      .xhs-sb-time { font-weight: 700; letter-spacing: .5px; }
      .xhs-sb-right { display: flex; align-items: center; gap: 6px; }
      .xhs-sb-batt { font-size: 11px; opacity: .9; }
      .xhs-sb-batt-ic { font-size: 12px; }
      .xhs-sb-btn {
        background: rgba(255,255,255,.2); border: none; color: #fff;
        width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
        font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0;
      }
      .xhs-sb-btn:active { background: rgba(255,255,255,.4); }
      #xhs-fab {
        position: fixed; z-index: 2000000000;
        right: calc(env(safe-area-inset-right, 0px) + 14px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
        width: 54px; height: 54px; border-radius: 50%;
        background: #ff2442; color: #fff; font-size: 26px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px rgba(0,0,0,.32); cursor: pointer; user-select: none;
        touch-action: none;
      }
      #xhs-frame {
        width: min(320px, 84vw);
        height: min(82vh, 600px);
        max-height: 82vh;
        background: #fff;
        border-radius: 30px 30px 18px 18px;
        border: 4px solid #111;
        box-shadow: 0 10px 40px rgba(0,0,0,0.35);
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
        color: #333;
        text-align: left;
        position: relative;
      }
      #xhs-frame * { box-sizing: border-box; }
      .xhs-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; position: relative; }
      .xhs-home { flex: 1; display: flex; flex-direction: column; background: linear-gradient(160deg,#8ec5fc,#e0c3fc); padding: 10px 0 24px; position: relative; overflow: hidden; }
      .xhs-home-wall { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
      .xhs-home-clock, .xhs-home-grid { position: relative; z-index: 1; }
      .xhs-home-clock { text-align: center; color: var(--home-fg,#fff); margin: 36px 0 44px; text-shadow: 0 1px 6px rgba(0,0,0,.18); }
      .xhs-home-time { font-size: 58px; font-weight: 200; line-height: 1; letter-spacing: 1px; }
      .xhs-home-date { font-size: 14px; margin-top: 8px; opacity: .95; }
      .xhs-home-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px 6px; padding: 0 20px; }
      .xhs-app { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
      .xhs-app-ic { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 31px; box-shadow: 0 5px 12px rgba(0,0,0,.2); position: relative; overflow: hidden; }
      .xhs-app-icwrap { position: relative; width: 60px; height: 60px; overflow: visible; }
      .xhs-app-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .xhs-lurk-name { color: #9b6dff; text-decoration: underline; cursor: pointer; }
      .xhs-charm { position: absolute; top: 3px; left: 20px; right: auto; z-index: 6; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
      .xhs-charm-ring { width: 9px; height: 9px; border: 2px solid #aeb2bb; border-radius: 50%; background: rgba(255,255,255,.5); }
      .xhs-charm-chain { width: 3px; height: 120px; background: repeating-linear-gradient(#eef0f3 0 3px, #9a9ea7 3px 6px); border-radius: 2px; }
      .xhs-charm-emoji { font-size: 32px; margin-top: -3px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      .xhs-charm-img { width: 46px; height: 46px; object-fit: contain; margin-top: -2px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
      .xhs-charm2 { position: absolute; top: 4px; left: 26px; z-index: 6; display: flex; flex-direction: column; align-items: center; pointer-events: none; transform: rotate(36deg); transform-origin: top center; }
      .xhs-charm-chain-long { height: 150px; }
      .xhs-charm2-body { transform: rotate(-36deg); }
      .xhs-app:active .xhs-app-ic { transform: scale(.92); }
      .xhs-app-name { font-size: 12px; color: var(--home-fg,#fff); text-shadow: 0 1px 3px rgba(0,0,0,.3); }
      .xhs-app-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 4px; background: #ff2442; color: #fff; border-radius: 9px; font-size: 11px; line-height: 18px; text-align: center; border: 2px solid #fff; box-sizing: content-box; }
      .wx-topbar { background: #ededed !important; color: #111 !important; border-bottom: 1px solid #dcdcdc; }
      .wx-topbar .xhs-icon-btn svg path { stroke: #111 !important; }
      .wx-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: #fff; border-bottom: 1px solid #f2f2f2; cursor: pointer; }
      .wx-row:active { background: #e9e9e9; }
      .wx-av { width: 44px; height: 44px; border-radius: 6px; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex: 0 0 44px; }
      .wx-info { flex: 1; min-width: 0; }
      .wx-row-top { display: flex; justify-content: space-between; align-items: baseline; }
      .wx-row-name { font-size: 15px; color: #111; font-weight: 500; }
      .wx-row-time { font-size: 11px; color: #b0b0b0; flex: 0 0 auto; margin-left: 8px; }
      .wx-row-prev { font-size: 13px; color: #999; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .wx-nav { flex: 0 0 auto; display: flex; background: #f7f7f7; border-top: 1px solid #dcdcdc; }
      .wx-tab { flex: 1; background: none; border: none; cursor: pointer; padding: 7px 0 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; color: #8a93a0; font-size: 11px; }
      .wx-tab-on { color: #1aad19; }
      .wx-tab-ic { position: relative; display: flex; align-items: center; justify-content: center; height: 26px; }
      .wx-tab-ic svg { width: 26px; height: 26px; display: block; }
      .wx-tab-dot { position: absolute; top: -3px; right: -8px; min-width: 16px; height: 16px; padding: 0 3px; background: #fa5151; color: #fff; border-radius: 8px; font-size: 10px; line-height: 16px; text-align: center; }
      .wx-me-card { background: #fff; display: flex; align-items: center; gap: 14px; padding: 22px 16px; }
      .wx-me-av { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex: 0 0 60px; }
      .wx-me-av img { width: 100%; height: 100%; object-fit: cover; }
      .wx-me-av span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; color: #fff; font-size: 26px; }
      .wx-me-name { font-size: 19px; font-weight: 600; color: #111; }
      .wx-me-bio { font-size: 13px; color: #999; margin-top: 6px; }

      /* 顶栏 */
      .xhs-topbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; background: #fff;
        flex-shrink: 0; min-height: 44px;
      }
      .xhs-topbar-feed { border-bottom: none; }
      .xhs-tabs {
        display: flex; gap: 18px; align-items: center;
      }
      .xhs-tab {
        font-size: 14px; color: #999;
        padding: 4px 0;
      }
      .xhs-tab-active {
        color: #333; font-weight: 600; font-size: 16px;
        position: relative;
      }
      .xhs-tab-active::after {
        content: ''; position: absolute;
        bottom: -6px; left: 50%; transform: translateX(-50%);
        width: 16px; height: 3px; border-radius: 2px;
        background: #333;
      }
      .xhs-top-btns { display: flex; gap: 4px; }
      .xhs-icon-btn {
        background: transparent; border: none; cursor: pointer;
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        color: #333; font-size: 18px;
        padding: 4px;
      }
      .xhs-icon-btn svg { width: 22px; height: 22px; }
      .xhs-publish-btn {
        background: #ff2442; color: #fff; border: none;
        padding: 6px 16px; border-radius: 16px;
        font-size: 13px; cursor: pointer;
      }

      .xhs-scroll {
        flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; background: #f7f7f7;
        -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
      }
      .xhs-empty {
        text-align: center; color: #999; padding: 60px 20px;
        font-size: 13px; line-height: 1.6;
      }

      /* 双列网格 (四格: 2 列 x 2 行) */
      .xhs-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 8px;
        align-content: start;
      }
      .xhs-card {
        background: #fff; border-radius: 8px;
        overflow: hidden; position: relative;
        cursor: pointer;
        display: block; width: 100%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .xhs-cover {
        width: 100%; aspect-ratio: 3/4;
        position: relative; background: #f0f0f0;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .xhs-cover-icon {
        width: 40%; height: 40%;
        position: absolute;
        opacity: 0.5;
      }
      .xhs-cover-overlay {
        position: relative; z-index: 1;
        color: #555; font-size: 12px;
        padding: 4px 8px;
        background: rgba(255,255,255,0.85);
        border-radius: 4px;
        max-width: 85%;
        text-align: center;
        line-height: 1.4;
      }
      .xhs-mine-tag {
        position: absolute; top: 6px; left: 6px;
        background: #ff2442; color: #fff;
        font-size: 10px; padding: 2px 6px; border-radius: 4px;
        z-index: 2;
      }
      .xhs-card-body { padding: 8px 10px 10px; }
      .xhs-card-title {
        font-size: 13px; line-height: 1.4; color: #333;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden; min-height: 36px;
        margin-bottom: 6px;
      }
      .xhs-card-foot {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 11px;
      }
      .xhs-card-author {
        display: flex; align-items: center; gap: 5px;
        flex: 1; min-width: 0;
      }
      .xhs-card-avatar {
        width: 18px; height: 18px; border-radius: 50%;
        color: #fff; font-size: 10px; font-weight: bold;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .xhs-card-author-name {
        color: #888;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .xhs-card-like { color: #888; }
      .xhs-card-liked { color: #ff2442; }
      .xhs-char-badge {
        display: inline-block; margin-left: 5px; padding: 1px 6px;
        background: #ffe0ec; color: #e84393; border-radius: 8px;
        font-size: 10px; font-weight: 600; vertical-align: middle;
      }
      .wx-add-menu {
        position: absolute; top: 48px; right: 8px; z-index: 30;
        background: #4c4c4c; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        display: flex; flex-direction: column; overflow: hidden; min-width: 150px;
      }
      .wx-add-menu button {
        background: none; border: none; text-align: left; padding: 13px 16px;
        font-size: 14px; cursor: pointer; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; gap: 9px;
      }
      .wx-add-menu button:last-child { border-bottom: none; }
      .wx-add-menu button:active { background: rgba(255,255,255,0.08); }
      .wx-add-ic { font-size: 16px; }
      .xhs-grp-menu {
        position: absolute; top: 50px; right: 10px; z-index: 20;
        background: #fff; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        display: flex; flex-direction: column; overflow: hidden; min-width: 150px;
      }
      .xhs-grp-menu button {
        background: none; border: none; text-align: left; padding: 12px 16px;
        font-size: 14px; cursor: pointer; color: #333; border-bottom: 1px solid #f2f2f2;
      }
      .xhs-grp-menu button:last-child { border-bottom: none; }
      .xhs-grp-menu button:active { background: #f6f6f6; }

      /* 底部 nav */
      .xhs-bottom-nav {
        display: flex; align-items: center; justify-content: space-around;
        background: #fff; border-top: 1px solid #f0f0f0;
        padding: 8px 0 6px;
        flex-shrink: 0;
      }
      .xhs-nav-btn {
        background: transparent; border: none; cursor: pointer;
        display: flex; flex-direction: column; align-items: center;
        gap: 2px; color: #999; font-size: 10px;
        padding: 4px 16px;
        flex: 1;
      }
      .xhs-nav-btn svg { width: 22px; height: 22px; }
      .xhs-nav-active { color: #ff2442; }
      .xhs-nav-plus { padding: 0; }
      .xhs-plus-circle {
        background: #ff2442; color: #fff;
        width: 40px; height: 28px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 300;
      }

      /* 帖子详情顶部 */
      .xhs-view-top {
        border-bottom: 1px solid #f0f0f0;
      }
      .xhs-view-author {
        display: flex; align-items: center; gap: 6px;
        flex: 1; min-width: 0;
      }
      .xhs-view-avatar { width: 28px; height: 28px; font-size: 12px; flex-shrink: 0; }
      .xhs-view-author-name { font-size: 14px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .xhs-follow-btn {
        background: #ff2442; color: #fff; border: none;
        padding: 5px 14px; border-radius: 14px;
        font-size: 12px; cursor: pointer;
      }
      .xhs-view-scroll { padding-bottom: 60px; background: #fff; }

      /* 详情页大封面 */
      .xhs-view-cover {
        width: 100%; aspect-ratio: 1;
        background: #f0f0f0;
        position: relative;
        display: flex; align-items: center; justify-content: center;
      }
      .xhs-cover-icon-big {
        width: 30%; height: 30%; opacity: 0.4;
        position: absolute;
      }
      .xhs-view-cover-overlay {
        position: relative; z-index: 1;
        color: #444; font-size: 16px;
        padding: 12px 18px;
        background: rgba(255,255,255,0.85);
        border-radius: 8px;
        max-width: 80%;
        text-align: center;
        line-height: 1.5;
      }

      /* 帖子正文 */
      .xhs-post-body {
        background: #fff; padding: 16px;
      }
      .xhs-post-title {
        font-size: 17px; font-weight: 600;
        color: #333; margin-bottom: 10px;
      }
      .xhs-post-content {
        font-size: 14px; line-height: 1.7;
        color: #444; white-space: pre-wrap;
      }
      .xhs-post-meta {
        margin-top: 14px;
        font-size: 12px; color: #999;
      }

      /* 评论区(真小红书样式) */
      .xhs-post-tools {
        display: flex; justify-content: flex-end; align-items: center; gap: 10px;
        padding: 8px 14px; background: #fff;
      }
      .xhs-tool-btn {
        background: none; border: none; border-radius: 0;
        width: 28px; height: 28px; padding: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .xhs-tool-btn:active { opacity: .5; }
      .xhs-tool-btn svg { width: 22px; height: 22px; }
      .xhs-comment-section {
        background: #fff; margin-top: 0; padding: 14px;
      }
      .xhs-c-title {
        font-size: 14px; font-weight: 600; margin-bottom: 12px;
        color: #333;
      }
      .xhs-c-item {
        display: flex; gap: 10px; padding: 8px 0;
      }
      .xhs-c-selrow { cursor: pointer; align-items: center; border-radius: 8px; padding: 6px 6px; }
      .xhs-c-selon { background: #fff0f3; }
      .wx-pick {
        flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%;
        border: 1.5px solid #c8c8c8; background: #fff; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; line-height: 1; margin-right: 10px;
      }
      .wx-pick-on { background: #07c160; border-color: #07c160; }
      .xhs-c-selbox {
        flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
        border: 1.5px solid #ff8aa0; color: #fff; background: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; line-height: 1;
      }
      .xhs-c-selon .xhs-c-selbox { background: #ff2442; border-color: #ff2442; }
      .xhs-c-delmenu { display: flex; gap: 8px; margin-top: 6px; }
      .xhs-c-delmenu button {
        border: none; border-radius: 6px; padding: 4px 14px; font-size: 12px; cursor: pointer;
      }
      .xhs-c-delmenu button[data-action="del-comment"] { background: #ff2442; color: #fff; }
      .xhs-c-delmenu button[data-action="cmt-multi"] { background: #eee; color: #555; }
      .xhs-c-avatar {
        width: 28px; height: 28px; border-radius: 50%;
        color: #fff; font-size: 12px; font-weight: bold;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .xhs-c-body { flex: 1; min-width: 0; }
      .xhs-c-author {
        font-size: 12px; color: #888; margin-bottom: 2px;
      }
      .xhs-c-replyto { color: #999; }
      .xhs-c-name { color: #576b95; }
      .xhs-c-text {
        font-size: 14px; color: #333; line-height: 1.5;
        word-wrap: break-word;
      }
      .xhs-c-empty {
        color: #999; font-size: 12px; padding: 12px 0;
        text-align: center;
      }
      .xhs-gen-btn {
        background: #e8f4fd; color: #576b95; border: none;
        padding: 10px; border-radius: 8px;
        font-size: 13px; cursor: pointer;
        width: 100%; max-width: 100%; box-sizing: border-box; margin-top: 10px;
      }

      /* 详情底部评论输入 */
      .xhs-c-bottom-input {
        flex-shrink: 0;
        display: flex; gap: 6px; padding: 6px 10px 10px; align-items: center;
        background: #fff; border-top: 1px solid #f0f0f0;
      }
      .xhs-c-bottom-input input {
        flex: 1 1 auto; min-width: 0; padding: 6px 14px;
        border: none; background: #f5f5f5;
        border-radius: 18px;
        font-size: 13px;
      }
      .xhs-c-send {
        background: #ff2442; color: #fff; border: none;
        padding: 0 14px; height: 34px; border-radius: 18px;
        font-size: 13px; cursor: pointer; flex: 0 0 auto; white-space: nowrap;
      }

      /* 发帖表单 */
      .xhs-pub-row {
        margin-bottom: 14px;
      }
      .xhs-pub-row label {
        display: block; font-size: 12px; color: #888;
        margin-bottom: 4px; font-weight: 500;
      }
      .xhs-pub-row input,
      .xhs-pub-row textarea {
        width: 100%; padding: 10px 12px;
        border: 1px solid #e8e8e8; border-radius: 8px;
        font-size: 14px; box-sizing: border-box;
        font-family: inherit;
      }
      .xhs-pub-row textarea {
        resize: vertical; min-height: 120px;
      }

      /* 粉丝群列表 */
      .xhs-group-row {
        display: flex; gap: 12px; padding: 14px;
        background: #fff; border-bottom: 1px solid #f0f0f0;
        cursor: pointer; align-items: center;
      }
      .xhs-group-avatar {
        width: 44px; height: 44px; border-radius: 8px;
        color: #fff; display: flex;
        align-items: center; justify-content: center;
        font-size: 18px; font-weight: bold;
        flex-shrink: 0;
      }
      .xhs-group-info { flex: 1; min-width: 0; }
      .xhs-group-name { font-size: 14px; font-weight: 500; }
      .xhs-group-meta { font-size: 11px; color: #999; margin-top: 2px; }

      /* 群聊 */
      .xhs-grp-chat {
        flex: 1; min-height: 0; overflow-y: auto;
        background: #ededed; padding: 8px;
        -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
      }
      .xhs-grp-msg {
        display: flex; flex-direction: column;
        margin: 6px 0; max-width: 75%;
      }
      .xhs-grp-me { align-items: flex-end; margin-left: auto; }
      .xhs-grp-other { align-items: flex-start; }
      .xhs-grp-name {
        font-size: 11px; color: #888; margin-bottom: 2px; padding: 0 8px;
      }
      .xhs-grp-bubble {
        padding: 8px 12px; border-radius: 10px;
        font-size: 13px; line-height: 1.5;
        background: #fff;
        word-wrap: break-word;
      }
      .xhs-grp-me .xhs-grp-bubble { background: #95ec69; }
      .xhs-grp-sys {
        text-align: center; color: #999; font-size: 11px;
        padding: 6px;
      }
      .xhs-grp-time {
        text-align: center; margin: 8px auto 4px; font-size: 11px; color: #fff;
        background: rgba(0,0,0,.14); border-radius: 6px; padding: 2px 8px;
        width: fit-content; max-width: 70%;
      }
      .xhs-grp-input {
        display: flex; gap: 6px; padding: 6px 10px 10px; align-items: center;
        background: #f7f7f7; border-top: 1px solid #ddd;
        flex-shrink: 0;
      }
      .xhs-grp-input input {
        flex: 1; min-width: 0; padding: 6px 12px;
        border: 1px solid #ddd; border-radius: 18px;
        font-size: 13px; background: #fff;
      }
      .xhs-chat-icon {
        background: #fff; border: 1px solid #e2e2e2; border-radius: 50%;
        width: 30px; height: 30px; flex-shrink: 0; cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .xhs-chat-icon svg { width: 20px; height: 20px; }
      .xhs-chat-send {
        background: #ff2442; border: none; border-radius: 50%;
        width: 32px; height: 32px; flex-shrink: 0; cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .xhs-chat-send svg { width: 20px; height: 20px; }

      /* 聊天消息:头像 + 气泡 */
      .xhs-cmsg { display: flex; gap: 8px; margin-bottom: 14px; align-items: flex-start; }
      .xhs-cmsg-me { flex-direction: row-reverse; }
      .xhs-cmsg-av {
        width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
        overflow: hidden; cursor: pointer;
      }
      .xhs-cmsg-av img { width: 100%; height: 100%; object-fit: cover; }
      .xhs-cmsg-av-wx, .xhs-cmsg-av-wx span { border-radius: 6px !important; }
      .xhs-cmsg-av span {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 16px; border-radius: 50%;
      }
      .xhs-cmsg-col { max-width: 72%; display: flex; flex-direction: column; }
      .xhs-cmsg-me .xhs-cmsg-col { align-items: flex-end; }
      .xhs-cmsg-name { font-size: 11px; color: #999; margin: 0 0 3px 2px; }
      .xhs-bubble {
        background: #fff; padding: 9px 12px; border-radius: 10px;
        font-size: 14px; line-height: 1.45; word-break: break-word;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .xhs-cmsg-me .xhs-bubble { background: #95ec69; }
      .xhs-bubble-voice { min-width: 110px; }
      .xhs-voice-top { display: flex; align-items: center; justify-content: space-between; gap: 18px; font-size: 14px; color: #555; }
      .xhs-cmsg-me .xhs-voice-top { color: #2a4d1a; }
      .xhs-voice-text { font-size: 14px; font-weight: normal; line-height: 1.45; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.08); }
      .xhs-bubble-img { padding: 8px; }
      .xhs-bubble-img .xhs-cover-icon { width: 40px; height: 40px; display: block; margin: 8px auto; }
      .xhs-img-cap { font-size: 13px; color: #555; text-align: center; max-width: 160px; }
      .xhs-cmsg-me .xhs-img-cap { color: #2a4d1a; }
      .xhs-bubble-transfer { background: #f5a623 !important; color: #fff !important; min-width: 180px; padding: 11px 13px !important; }
      .xhs-cmsg-me .xhs-bubble-transfer { background: #f5a623 !important; color: #fff !important; }
      .xhs-tf-row { display: flex; align-items: center; gap: 10px; }
      .xhs-tf-ic { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; font-size: 17px; flex: 0 0 32px; }
      .xhs-tf-mid { min-width: 0; }
      .xhs-tf-amt { font-size: 18px; font-weight: 700; }
      .xhs-tf-note { font-size: 12px; opacity: .92; margin-top: 1px; }
      .xhs-tf-foot { font-size: 11px; opacity: .85; margin-top: 9px; border-top: 1px solid rgba(255,255,255,.3); padding-top: 5px; }
      .xhs-heart-row { display: flex; justify-content: center; margin: 10px 8px; }
      .xhs-heart-bub { max-width: 80%; background: rgba(155,109,255,.08); border: 1px dashed #c3a6f5; border-radius: 12px; padding: 8px 12px; color: #6a4bb0; font-size: 13px; font-style: italic; }
      .xhs-heart-tag { font-size: 10px; font-style: normal; color: #9b6dff; background: rgba(155,109,255,.14); border-radius: 8px; padding: 1px 6px; margin-left: 2px; }
      .xhs-heart-text { margin-top: 5px; line-height: 1.45; }
      .xhs-msg-menu { margin-top: 5px; display: inline-flex; flex-wrap: wrap; background: #4b4b4d; border-radius: 9px; overflow: hidden; align-self: flex-start; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
      .xhs-cmsg-me .xhs-msg-menu { align-self: flex-end; }
      .xhs-msg-menu button { background: none; border: none; color: #fff; font-size: 13px; padding: 7px 12px; cursor: pointer; white-space: nowrap; }
      .xhs-msg-menu button + button { border-left: 1px solid rgba(255,255,255,.18); }
      .xhs-quote-ref { font-size: 12px; color: #8a8a8a; background: rgba(0,0,0,.06); border-left: 3px solid #c4ccdb; border-radius: 4px; padding: 4px 8px; margin-bottom: 4px; max-width: 100%; line-height: 1.4; word-break: break-word; }
      .xhs-quote-ref b { color: #6f7891; font-weight: 600; }
      .xhs-cmsg-me .xhs-quote-ref { align-self: flex-end; }
      .xhs-quote-bar { display: flex; align-items: center; gap: 8px; margin: 0 10px 6px; padding: 7px 10px; background: rgba(127,138,160,.14); border-left: 3px solid #a9b4d0; border-radius: 6px; font-size: 12px; color: #5a5a5a; }
      .xhs-quote-bar-txt { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .xhs-quote-x { flex-shrink: 0; background: none; border: none; color: #888; font-size: 17px; line-height: 1; cursor: pointer; padding: 0 2px; }
      .xhs-bubble-voice { cursor: pointer; }
      .xhs-chat-send-wx { background: #a9b4d0 !important; }
      .xhs-notif { position: absolute; top: 40px; left: 8px; right: 8px; z-index: 50; background: rgba(38,38,40,.96); color: #fff; border-radius: 14px; padding: 11px 14px; font-size: 13px; box-shadow: 0 6px 22px rgba(0,0,0,.32); cursor: pointer; animation: xhsNotifIn .25s ease; }
      .xhs-notif-body { line-height: 1.45; word-break: break-word; }
      .xhs-notif b { font-weight: 600; }
      .xhs-notif-hide { opacity: 0; transition: opacity .45s; }
      @keyframes xhsNotifIn { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .xhs-chatimg { min-width: 112px; max-width: 78%; background: #fafafa; border-radius: 12px; padding: 16px 18px; color: #555; font-size: 14px; line-height: 1.55; text-align: center; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
      .xhs-chatimg-tag { font-size: 11px; color: #bbb; margin-bottom: 6px; letter-spacing: .5px; }
      .xhs-cmsg-me .xhs-chatimg { margin-left: auto; }
      .wx-sel-wrap { display: flex; align-items: center; gap: 8px; padding: 2px 4px; border-radius: 8px; cursor: pointer; }
      .wx-sel-on { background: rgba(26,173,25,.1); }
      .wx-sel-box { flex: 0 0 20px; width: 20px; height: 20px; border-radius: 50%; border: 1.6px solid #bbb; color: #fff; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; }
      .wx-sel-on .wx-sel-box { background: #1aad19; border-color: #1aad19; }
      .wx-sel-inner { flex: 1; min-width: 0; pointer-events: none; }
      .wx-sel-bar { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f7f7f7; border-top: 1px solid #dcdcdc; font-size: 14px; color: #555; }
      .xhs-cmsg-me .xhs-bubble-share { background: #fff !important; color: #222; }
      .xhs-share-flag { font-size: 11px; color: #ff2442; font-weight: 600; margin-bottom: 6px; }
      .xhs-share-body { display: flex; gap: 8px; }
      .xhs-share-cv { width: 52px; height: 52px; border-radius: 6px; background: #f0f0f0; flex: 0 0 52px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .xhs-share-cv svg { width: 26px; height: 26px; }
      .xhs-share-cv-text { background: linear-gradient(135deg,#ffd9e1,#ffe9c7); color: #8a5a3a; font-size: 9px; line-height: 1.2; padding: 4px; text-align: center; }
      .xhs-share-meta { flex: 1; min-width: 0; }
      .xhs-share-title { font-size: 13px; font-weight: 600; color: #222; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .xhs-share-author { font-size: 11px; color: #999; margin-top: 4px; }
      .xhs-fwd-mask { position: absolute; inset: 0; background: rgba(0,0,0,.35); z-index: 40; }
      .xhs-fwd-sheet { position: absolute; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 16px 16px 0 0; z-index: 41; max-height: 70%; display: flex; flex-direction: column; animation: xhsFwdUp .2s ease; }
      @keyframes xhsFwdUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .xhs-fwd-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; font-weight: 600; border-bottom: 1px solid #f0f0f0; }
      .xhs-fwd-x { background: none; border: none; font-size: 16px; color: #999; cursor: pointer; }
      .xhs-fwd-list { overflow-y: auto; padding: 6px 0 14px; }
      .xhs-fwd-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; }
      .xhs-fwd-row:active { background: #f7f7f7; }
      .xhs-cr-btn { background: #fff0f5; color: #ff2e63; border: 1px solid #ffd1dc; border-radius: 13px; padding: 5px 9px; font-size: 11px; cursor: pointer; white-space: nowrap; }
      .xhs-cr-btn:active { background: #ffd1dc; }
      .xhs-fwd-av { width: 42px; height: 42px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex: 0 0 42px; overflow: hidden; }
      .xhs-fwd-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .xhs-fwd-av span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      .xhs-fwd-info { flex: 1; min-width: 0; }
      .xhs-fwd-name { font-size: 14px; font-weight: 500; color: #222; }
      .xhs-fwd-sub { font-size: 12px; color: #999; margin-top: 2px; }
      .xhs-fwd-go { font-size: 13px; color: #fff; background: #ff2442; border-radius: 14px; padding: 4px 14px; }

      /* 加号附件面板 */
      .xhs-attach-panel {
        display: flex; gap: 10px; padding: 14px;
        background: #eef1f5; flex-shrink: 0; border-top: 1px solid #ddd;
      }
      .xhs-attach-item {
        background: none; border: none; cursor: pointer;
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        font-size: 12px; color: #555;
      }
      .xhs-attach-ic {
        width: 52px; height: 52px; border-radius: 14px;
        background: #f2f3f5; color: #6a7180;
        display: flex; align-items: center; justify-content: center;
      }
      .xhs-attach-ic svg { width: 26px; height: 26px; }
      /* 表情包 */
      .xhs-sticker-msg { max-width: 120px; max-height: 120px; border-radius: 8px; display: block; }
      .xhs-sticker-tray {
        display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 14px;
        background: #eef1f5; flex-shrink: 0; max-height: 200px; overflow-y: auto;
        -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y;
      }
      .xhs-sticker-pick { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; cursor: pointer; background: #fff; }
      .xhs-sticker-preview { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .xhs-sticker-preview img { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; }
      .xhs-wall-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
      .xhs-wall { height: 64px; border-radius: 10px; border: 2px solid transparent; cursor: pointer; position: relative; color: #fff; font-size: 12px; text-shadow: 0 1px 3px rgba(0,0,0,.4); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; }
      .xhs-wall-on { border-color: #ff2442; box-shadow: 0 0 0 2px rgba(255,36,66,.25); }
      .xhs-c-sticker { max-width: 100px; max-height: 100px; border-radius: 6px; margin-top: 6px; display: block; }
      .xhs-c-img {
        display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;
        background: #f0f0f0; border-radius: 8px; padding: 8px 10px; max-width: 200px;
      }
      .xhs-c-img svg { width: 24px; height: 24px; flex-shrink: 0; }
      .xhs-c-img span { font-size: 12px; color: #888; }

      /* 删除帖子 */
      .xhs-card-del {
        position: absolute; top: 6px; right: 6px; z-index: 3;
        width: 26px; height: 26px; border-radius: 50%; border: none;
        background: rgba(0,0,0,0.45); color: #fff; font-size: 13px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      .xhs-del-btn {
        background: #fff; border: 1px solid #ffccd5; color: #ff2442;
        padding: 5px 14px; border-radius: 16px; font-size: 13px; cursor: pointer;
      }
      /* tag + 帖子点赞 */
      .xhs-post-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
      .xhs-tag { color: #3a6ea5; font-size: 13px; }
      .xhs-post-like {
        background: none; border: none; cursor: pointer; padding: 4px; flex-shrink: 0;
        display: flex; align-items: center;
      }
      .xhs-post-like svg { width: 26px; height: 26px; }

      /* 设置 */
      .xhs-set-section {
        background: #fff; padding: 14px;
        margin-bottom: 10px; border-radius: 10px;
        box-sizing: border-box; overflow: hidden;
      }
      details.xhs-set-section { padding: 0; }
      details.xhs-set-section > *:not(summary) { margin-left: 14px; margin-right: 14px; }
      details.xhs-set-section > *:last-child { margin-bottom: 14px; }
      .xhs-set-title {
        font-weight: 600; margin-bottom: 10px; font-size: 14px;
      }
      summary.xhs-set-title {
        list-style: none; cursor: pointer; padding: 13px 14px; margin: 0;
        display: flex; align-items: center; justify-content: space-between;
        user-select: none;
      }
      summary.xhs-set-title::-webkit-details-marker { display: none; }
      summary.xhs-set-title::after { content: '⌄'; color: #bbb; font-size: 16px; transition: transform .2s; }
      details[open] > summary.xhs-set-title::after { transform: rotate(180deg); }
      .xhs-set-hint { font-size: 11px; color: #aaa; text-align: center; margin-bottom: 10px; }
      .xhs-nav-dot {
        position: absolute; top: 2px; left: 52%; min-width: 15px; height: 15px;
        padding: 0 3px; background: #ff2442; color: #fff; border-radius: 8px;
        font-size: 10px; line-height: 15px; text-align: center; font-weight: 600;
      }
      .xhs-msg-pinned { background: #fff8f9; }
      .xhs-pin-tag { font-size: 9px; color: #ff6b81; border: 1px solid #ffc2cd; border-radius: 4px; padding: 0 3px; margin-left: 4px; vertical-align: middle; }
      .xhs-msg-del {
        background: none; border: none; font-size: 12px; opacity: 0.35;
        padding: 2px 4px; cursor: pointer; align-self: center; line-height: 1;
      }
      .xhs-msg-del:active { opacity: 1; }
      .xhs-notif-stack {
        position: absolute; left: 10px; right: 10px; bottom: 64px; z-index: 30;
        display: flex; flex-direction: column; gap: 8px; pointer-events: none;
      }
      .xhs-notif-card {
        pointer-events: auto; display: flex; align-items: center; gap: 10px;
        background: rgba(255,255,255,0.97); border-radius: 14px; padding: 10px 12px;
        box-shadow: 0 6px 22px rgba(0,0,0,0.18); cursor: pointer;
        animation: xhs-notif-in .28s cubic-bezier(.2,.8,.3,1);
      }
      @keyframes xhs-notif-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .xhs-notif-avatar { width: 36px; height: 36px; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
      .xhs-notif-body { flex: 1; min-width: 0; }
      .xhs-notif-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; }
      .xhs-notif-text { font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .xhs-notif-x { background: none; border: none; font-size: 18px; color: #bbb; cursor: pointer; padding: 0 4px; flex-shrink: 0; }
      .xhs-set-hint-dup { display:none; }
      .xhs-set-help {
        font-size: 11px; color: #888; margin-bottom: 10px;
        line-height: 1.5;
      }
      .xhs-set-check {
        display: flex; align-items: center; gap: 6px;
        font-size: 13px; padding: 4px 0;
      }
      .xhs-set-btn {
        display: block; width: 100%; max-width: 100%; box-sizing: border-box;
        padding: 10px; border: none; border-radius: 6px;
        background: #576b95; color: #fff;
        font-size: 13px; cursor: pointer;
        margin-top: 6px;
      }
      .xhs-model-select {
        display: block; width: 100%;
        padding: 9px; margin-top: 6px;
        border: 1px solid #d0d4dc; border-radius: 6px;
        font-size: 13px; background: #fff; color: #333;
      }

      /* 居中 tab + 顶部生成按钮 + 分类条 */
      .xhs-tabs-center { flex: 1; justify-content: center; }
      .xhs-gen-top svg { width: 22px; height: 22px; }
      .xhs-cats {
        display: flex; align-items: center; padding: 7px 14px 9px;
        flex-shrink: 0; background: #fff;
        border-bottom: 1px solid #f0f0f0;
        justify-content: space-between;
      }
      .xhs-cat { font-size: 14px; color: #999; white-space: nowrap; cursor: pointer; }
      .xhs-cat-active { color: #333; font-weight: 600; }
      .xhs-cat-more { color: #bbb; font-size: 16px; margin-left: 2px; }
      .xhs-fic-bar {
        display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        padding: 7px 14px; background: #fdeef2; border-bottom: 1px solid #f3dce3;
        flex-shrink: 0;
      }
      .xhs-fic-iconbtn {
        border: none; background: #eb8ba5; color: #fff; padding: 0;
        width: 30px; height: 30px; border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .xhs-fic-iconbtn svg { width: 17px; height: 17px; }
      .xhs-fic-iconbtn:active { background: #db7991; }
      .xhs-fic-clear {
        border: 1px solid #e6bcc8; background: transparent; color: #b56b7e;
        font-size: 12px; padding: 5px 13px; border-radius: 15px; cursor: pointer; white-space: nowrap;
      }
      .xhs-fic-clear:active { background: #f7e4e9; }

      /* 评论操作 / 点赞 / 回复 */
      .xhs-c-item { position: relative; }
      .xhs-c-actions { display: flex; align-items: center; gap: 10px; margin-top: 3px; flex-wrap: wrap; }
      .xhs-c-actions > * { flex-shrink: 0; white-space: nowrap; }
      .xhs-msg-avatar, .xhs-c-avatar, .xhs-card-avatar, .wx-av, .xhs-nt-avatar { overflow: hidden; }
      .xhs-msg-avatar img, .xhs-c-avatar img, .xhs-card-avatar img, .wx-av img, .xhs-nt-avatar img, .xhs-shot-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .xhs-msg-avatar span, .xhs-c-avatar span, .xhs-card-avatar span, .wx-av span, .xhs-nt-avatar span, .xhs-shot-av span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      .xhs-c-time { font-size: 11px; color: #bbb; }
      .xhs-c-reply-btn {
        background: none; border: none; cursor: pointer;
        font-size: 12px; color: #999; padding: 0;
      }
      .xhs-c-regen-btn {
        background: none; border: none; cursor: pointer; color: #bbb;
        padding: 0; display: inline-flex; align-items: center;
      }
      .xhs-c-regen-btn svg { width: 14px; height: 14px; }
      .xhs-c-regen-btn:active { color: #ff2442; }
      .xhs-c-like {
        background: none; border: none; cursor: pointer;
        display: flex; flex-direction: column; align-items: center;
        gap: 2px; padding: 0 2px; min-width: 26px;
      }
      .xhs-c-like svg { width: 16px; height: 16px; }
      .xhs-c-like span { font-size: 11px; color: #999; }
      .xhs-c-liked span { color: #ff2442; }
      .xhs-reply-bar {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 14px; font-size: 12px; color: #666;
        background: #f3f3f3; border-top: 1px solid #eee;
      }
      .xhs-reply-bar b { color: #ff2442; }
      .xhs-reply-cancel { margin-left: auto; background: none; border: none; cursor: pointer; color: #999; }

      /* 消息页 */
      .xhs-mq-dot {
        position: absolute; top: -2px; right: 50%; transform: translateX(22px);
        min-width: 16px; height: 16px; padding: 0 4px; background: #ff2442; color: #fff;
        border-radius: 8px; font-size: 10px; line-height: 16px; text-align: center; font-weight: 600;
      }
      .xhs-nt-row {
        display: flex; gap: 11px; padding: 14px; border-bottom: 1px solid #f2f2f2; cursor: pointer;
      }
      .xhs-nt-row:active { background: #fafafa; }
      .xhs-nt-avatar {
        width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
        color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600;
      }
      .xhs-nt-body { flex: 1; min-width: 0; }
      .xhs-nt-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
      .xhs-nt-name { font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; flex-shrink: 0; }
      .xhs-nt-time { font-size: 11px; color: #bbb; flex-shrink: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; }
      .xhs-nt-text { font-size: 14px; color: #222; margin-top: 3px; line-height: 1.4; }
      .xhs-nt-quote {
        font-size: 12px; color: #999; margin-top: 5px; padding: 5px 8px;
        background: #f5f5f5; border-radius: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .xhs-msg-quick {
        display: flex; justify-content: space-around;
        padding: 16px 10px; background: #fff;
      }
      .xhs-mq { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: #555; }
      .xhs-mq-ic {
        width: 46px; height: 46px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; font-size: 20px;
      }
      .xhs-msg-row {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px; cursor: pointer; background: #fff;
        border-bottom: 1px solid #f5f5f5;
      }
      .xhs-msg-avatar {
        width: 44px; height: 44px; border-radius: 50%;
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .xhs-msg-info { flex: 1; min-width: 0; }
      .xhs-msg-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
      .xhs-msg-name { font-size: 15px; font-weight: 500; color: #222; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .xhs-msg-time { font-size: 11px; color: #bbb; flex-shrink: 0; white-space: nowrap; }
      .xhs-msg-preview { font-size: 13px; color: #999; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .xhs-msg-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff2442; flex-shrink: 0; }

      /* 个人主页 */
      .xhs-prof-head { padding: 12px 16px 16px; color: #fff; flex-shrink: 0; }
      .xhs-prof-topbar { display: flex; justify-content: space-between; align-items: center; }
      .xhs-prof-editbtn {
        background: rgba(255,255,255,0.25); color: #fff; border: none;
        padding: 5px 12px; border-radius: 14px; font-size: 12px; cursor: pointer;
      }
      .xhs-prof-id { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
      .xhs-prof-avatar {
        width: 60px; height: 60px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 32px;
        overflow: hidden; flex-shrink: 0;
      }
      .xhs-prof-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .xhs-prof-name { font-size: 20px; font-weight: 700; }
      .xhs-prof-sub { font-size: 12px; opacity: 0.9; margin-top: 8px; }
      .xhs-prof-stats { display: flex; gap: 20px; margin-top: 12px; font-size: 12px; opacity: 0.95; }
      .xhs-prof-stats b { font-size: 16px; }
      .xhs-prof-bio { font-size: 13px; margin-top: 10px; opacity: 0.95; }
      .xhs-prof-bio-btn { background: rgba(255,255,255,0.25); color: #fff; border: none; padding: 2px 9px; border-radius: 12px; font-size: 11px; cursor: pointer; margin-left: 6px; vertical-align: middle; white-space: nowrap; }
      .xhs-prof-btns { display: flex; gap: 10px; margin-top: 14px; }
      .xhs-prof-action {
        flex: 1; padding: 8px; border-radius: 16px; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.6); background: rgba(255,255,255,0.18);
        color: #fff; font-size: 13px;
      }
      .xhs-prof-tabs {
        display: flex; gap: 24px; padding: 10px 16px;
        background: #fff; flex-shrink: 0; border-bottom: 1px solid #f0f0f0;
      }
      .xhs-prof-tab { font-size: 14px; color: #999; }
      .xhs-prof-tab-active { color: #333; font-weight: 600; position: relative; }
      .xhs-prof-tab-active::after {
        content: ''; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
        width: 18px; height: 3px; border-radius: 2px; background: #ff2442;
      }

      /* 评论楼层 / 徽章 / 展开 */
      .xhs-c-badge-author {
        display: inline-block; margin-left: 6px; padding: 0 5px;
        font-size: 10px; color: #fff; background: #ff2442; border-radius: 3px;
        vertical-align: middle;
      }
      .xhs-c-loc { font-size: 11px; color: #bbb; }
      .xhs-c-first {
        font-size: 10px; color: #888; background: #f0f0f0;
        padding: 0 5px; border-radius: 3px;
      }
      .xhs-c-replies {
        margin-left: 44px; margin-top: 4px;
        padding-left: 0;
      }
      .xhs-c-reply-item { padding-top: 6px; }
      .xhs-c-reply-item .xhs-c-avatar { width: 26px; height: 26px; font-size: 12px; }
      .xhs-c-expand {
        background: none; border: none; cursor: pointer;
        font-size: 12px; color: #5b7baf; padding: 4px 0;
      }

      /* DM 小刷新回复按钮(发送左边) */
      .xhs-dm-reply-icon {
        background: #fff; border: 1px solid #ffccd5; border-radius: 50%;
        width: 34px; height: 34px; flex-shrink: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center; padding: 0;
      }
      .xhs-dm-reply-icon svg { width: 18px; height: 18px; }

      /* 头像填充 / 关注按钮 / 可点统计 */
      .xhs-prof-avatar span {
        width: 100%; height: 100%; display: flex;
        align-items: center; justify-content: center; border-radius: 50%;
      }
      .xhs-prof-stats div { cursor: pointer; }
      .xhs-follow-btn.xhs-followed { background: #f0f0f0; color: #999; }
      .xhs-prof-follow { background: rgba(255,36,66,0.85) !important; border-color: transparent !important; }
      .xhs-follow-mini {
        background: #f0f0f0; border: none; color: #999;
        padding: 5px 12px; border-radius: 14px; font-size: 12px; cursor: pointer; flex-shrink: 0;
      }
      .xhs-view-author { cursor: pointer; }

      /* 纯文字帖封面 */
      .xhs-cover-text {
        position: relative; padding: 14px 12px;
        display: flex; flex-direction: column; justify-content: center;
        min-height: 150px;
      }
      .xhs-cover-quote { font-size: 30px; line-height: 0.6; opacity: 0.6; font-family: Georgia, serif; }
      .xhs-cover-textmain {
        font-size: 17px; font-weight: 700; line-height: 1.45;
        margin-top: 6px; word-break: break-word;
      }
      .xhs-view-cover-text {
        aspect-ratio: auto; min-height: 220px; padding: 30px 24px;
        display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
      }
      .xhs-view-textmain { font-size: 24px; font-weight: 700; line-height: 1.5; word-break: break-word; }

      /* 发帖类型切换 */
      .xhs-pub-type { display: flex; gap: 10px; margin-bottom: 14px; }
      .xhs-pubtype-btn {
        flex: 1; padding: 10px; border-radius: 10px; cursor: pointer;
        border: 1px solid #e0e0e0; background: #fff; color: #666; font-size: 14px;
      }
      .xhs-pubtype-on { border-color: #ff2442; color: #ff2442; background: #fff0f2; font-weight: 600; }

      /* 聊天截图帖:网格小卡预览 */
      .xhs-cover-chat { min-height: 150px; padding: 12px 10px; display: flex; flex-direction: column; gap: 5px; position: relative; }
      .xhs-chat-badge { font-size: 11px; color: #888; margin-bottom: 2px; }
      .xhs-mini-bub {
        background: #fff; align-self: flex-start; max-width: 80%;
        padding: 5px 8px; border-radius: 8px; font-size: 11px; color: #444;
      }
      .xhs-mini-me { align-self: flex-end; background: #95ec69; }

      /* 聊天截图帖:详情大卡 */
      .xhs-view-cover-chat { aspect-ratio: auto; background: #ededed; padding: 0; }
      .xhs-shot { background: #ededed; padding: 16px 12px; }
      .xhs-shot-head { text-align: center; font-size: 12px; color: #999; margin-bottom: 14px; }
      .xhs-shot-msg { display: flex; gap: 8px; margin-bottom: 14px; align-items: flex-start; }
      .xhs-shot-me { flex-direction: row-reverse; }
      .xhs-shot-av {
        width: 36px; height: 36px; border-radius: 6px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px;
      }
      .xhs-shot-bub {
        max-width: 68%; background: #fff; padding: 9px 12px; border-radius: 8px;
        font-size: 14px; line-height: 1.45; word-break: break-word;
      }
      .xhs-shot-bub-sticker { background: transparent !important; padding: 0 !important; }
      .xhs-shot-sticker { width: 84px; height: 84px; object-fit: contain; display: block; }
      .xhs-shot-img { max-width: 150px; border-radius: 8px; display: block; }
      .xhs-shot-me .xhs-shot-bub { background: #95ec69; }
    `;
    doc.head.appendChild(style);
  }

  // ============ 注册 /yuyuan 命令 ============
  injectCSS();
  try { (window.parent || window.top || window).openXhs = openXhs; } catch (e) {}

  function findSlashApi() {
    const TOP = getTop();
    const candidates = [];
    try {
      const ctx = TOP.SillyTavern?.getContext?.();
      if (ctx?.SlashCommandParser) candidates.push({ parser: ctx.SlashCommandParser, cmd: ctx.SlashCommand });
    } catch (e) {}
    try { if (TOP.SlashCommandParser) candidates.push({ parser: TOP.SlashCommandParser, cmd: TOP.SlashCommand }); } catch (e) {}
    try {
      if (TOP.SillyTavern?.SlashCommandParser) candidates.push({ parser: TOP.SillyTavern.SlashCommandParser, cmd: TOP.SillyTavern.SlashCommand });
    } catch (e) {}
    for (const c of candidates) {
      if (c.parser?.addCommandObject && c.cmd?.fromProps) return c;
    }
    return null;
  }

  let cmdOk = false;
  // 脚本(重新)加载时,清掉上一个 iframe 残留的旧浮窗,避免旧浮窗事件失效后"点不动"
  try {
    const _T = getTop(); const _d = _T.document;
    try { if (_T.__xhsClockTimer) { clearInterval(_T.__xhsClockTimer); _T.__xhsClockTimer = null; } } catch (e) {}
    const _f = _d.getElementById('xhs-float'); if (_f && _f.parentNode) _f.parentNode.removeChild(_f);
    const _fb = _d.getElementById('xhs-fab'); if (_fb && _fb.parentNode) _fb.parentNode.removeChild(_fb);
  } catch (e) {}

  try {
    const api = findSlashApi();
    if (api) {
      const { parser, cmd: SlashCommand } = api;
      try {
        if (parser.commands?.xhs) delete parser.commands.xhs;
        if (parser._commands?.xhs) delete parser._commands.xhs;
        if (parser.commands?.yuyan) delete parser.commands.yuyan;
        if (parser._commands?.yuyan) delete parser._commands.yuyan;
        if (parser.commands?.yuyuan) delete parser.commands.yuyuan;
        if (parser._commands?.yuyuan) delete parser._commands.yuyuan;
      } catch (e) {}
      try {
        const cmd = SlashCommand.fromProps({
          name: 'yuyuan',
          callback: () => { try { openXhs(); } catch (e) { toastr.error('打开失败: ' + e.message); } return ''; },
          helpString: '打开小红书',
        });
        parser.addCommandObject(cmd);
        cmdOk = true;
      } catch (e) { console.error('[XHS] 注册失败', e); }
    }
  } catch (e) {}

  // 酒馆助手「脚本按钮」:在脚本设置的「按键绑定」里加一个按钮(名字用下面任意一个),点它即可打开手机。
  // 这个按钮由酒馆助手画在它自己的界面里,位置固定,iOS Safari / 手机端比悬浮按钮更可靠。
  try {
    if (typeof getButtonEvent === 'function' && typeof eventOn === 'function') {
      ['芋圆机弹出', '芋圆机', '打开芋圆机', '📱', '打开手机', '小手机', '小红书', '手机'].forEach(nm => {
        try { eventOn(getButtonEvent(nm), () => { try { openXhs(); } catch (e) { try { toastr.error('打开失败: ' + e.message); } catch (e2) {} } }); } catch (e) {}
      });
    }
  } catch (e) {}

  // 自动注册一个酒馆助手「脚本按钮」(名叫"芋圆机弹出",避免和 QR 同名混淆),免去手动添加;若助手版本没有该接口则跳过(用户仍可手动加)。
  // replaceScriptButtons 会整体替换【本脚本】的按钮列表(不影响 QR),所以先读现有按钮、清掉旧的"芋圆机"、合并"芋圆机弹出"后再写回,避免覆盖用户其它按钮、且不重复添加。
  try {
    if (typeof replaceScriptButtons === 'function') {
      let cur = [];
      try { cur = (typeof getScriptButtons === 'function') ? (getScriptButtons() || []) : []; } catch (e) { cur = []; }
      const hasOld = cur.some(b => b && b.name === '芋圆机');
      const hasNew = cur.some(b => b && b.name === '芋圆机弹出');
      if (hasOld || !hasNew) {
        let next = cur.filter(b => b && b.name !== '芋圆机');
        if (!next.some(b => b && b.name === '芋圆机弹出')) next.push({ name: '芋圆机弹出', visible: true });
        replaceScriptButtons(next);
      }
    }
  } catch (e) {}

  // 常驻悬浮启动按钮:手机端脚本加载早、body 可能还没就绪导致按钮没建出来,所以加载时建一次 + DOMContentLoaded + 多次延时重试,确保最终一定出现
  try { ensureFab(true); } catch (e) {}
  try {
    const _T = getTop(); const _doc = _T && _T.document;
    if (_doc && _doc.readyState === 'loading') _doc.addEventListener('DOMContentLoaded', () => { try { ensureFab(false); } catch (e) {} });
  } catch (e) {}
  [400, 1200, 3000, 6000].forEach(ms => { try { setTimeout(() => { try { ensureFab(false); } catch (e) {} }, ms); } catch (e) {} });

  if (typeof toastr !== 'undefined') {
    toastr.success('📱 芋圆机 v316 已加载,输入 /yuyuan 或点「芋圆机弹出」按钮打开', '', { timeOut: 3000 });
  }
  try { setTimeout(() => { try { pushXhsDirective(); } catch (e) {} }, 1500); } catch (e) {}
})();
