(function (Scratch) {
  "use strict";

  if (!Scratch || !Scratch.extensions || !Scratch.extensions.unsandboxed) {
    throw new Error("IGE: requires unsandboxed");
  }

  var TOKEN = Math.random().toString(36).slice(2) + "_" + Date.now();
  var VARS = {};
  var BANNED = false;
  var BAN_REASON = "";
  var LOG = [];
  var _frame = 0;
  var _lastWall = Date.now();

  function _h(name, val) {
    var s = (name || "") + "|" + (val || 0) + "|" + TOKEN.slice(-5);
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return h >>>0;
  }

  function _log(msg) {
    console.warn("[IGE]", msg);
    LOG.push(msg);
    if (LOG.length > 200) LOG.shift();
  }

  function _ban(reason) {
    if (BANNED) return;
    BANNED = true;
    BAN_REASON = reason || "unknown";
    _log("BAN: " + BAN_REASON);
    try { Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.stopAll(); } catch(_){}
    try {
      var d = document.createElement("div");
      d.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:rgba(40,0,0,.92);" +
        "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "font-family:Arial,sans-serif;color:#ff4444;font-size:22px;text-align:center;" +
        "padding:32px;pointer-events:auto;user-select:none";
      d.innerHTML =
        '<div style="font-size:56px;margin-bottom:10px">&#x1F6AB;</div>' +
        '<div style="font-weight:bold">IGE 反作弊 已拦截</div>' +
        '<div style="margin-top:8px;color:#ccc;font-size:14px">' +
        "原因：" + (""+BAN_REASON).replace(/</g,"&lt;").replace(/>/g,"&gt;") +
        "</div>" +
        '<div style="margin-top:18px;padding:6px 16px;border:1px solid #444;border-radius:6px;color:#888;font-size:12px;cursor:pointer"onclick="this.parentNode.remove()">关闭提示</div>';
      document.body.appendChild(d);
    } catch(_){}
  }

  function IGE(){}
  IGE.prototype.getInfo = function(){
    return {
      id:"ige",
      name:"\uD83D\uDEE1 IGE反作弊",
      color1:"#0f3460",color2:"#00d2ff",color3:"#533483",
      blocks:[
        {opcode:"watch",blockType:Scratch.BlockType.COMMAND,
         text:"IGE 监控变量 [NAME] 当前值 [VAL]",
         arguments:{NAME:{type:Scratch.ArgumentType.STRING,default:"score"},
                   VAL:{type:Scratch.ArgumentType.NUMBER,default:0}}},
        {opcode:"check",blockType:Scratch.BlockType.BOOLEAN,
         text:"IGE 校验 变量 [NAME] 当前值 [VAL]",
         arguments:{NAME:{type:Scratch.ArgumentType.STRING,default:"score"},
                   VAL:{type:Scratch.ArgumentType.NUMBER,default:0}}},
        {opcode:"tick",blockType:Scratch.BlockType.COMMAND,text:"IGE 帧心跳"},
        {opcode:"isBanned",blockType:Scratch.BlockType.BOOLEAN,text:"IGE 已被封禁？"},
        {opcode:"banReason",blockType:Scratch.BlockType.REPORTER,text:"IGE 封禁原因"},
        {opcode:"forceBan",blockType:Scratch.BlockType.COMMAND,
         text:"IGE 强制封禁 原因 [R]",
         arguments:{R:{type:Scratch.ArgumentType.STRING,default:"异常行为"}}}
      ]
    };
  };

  IGE.prototype.watch=function(a){
    if(BANNED)return;
    var n=(a.NAME||"").trim();if(!n)return;
    var v=Number(a.VAL);
    VARS[n]={v:v,h:_h(n,v)};_log('watch '+n+'='+v);
  };

  IGE.prototype.check=function(a){
    if(BANNED)return true;
    var n=(a.NAME||"").trim(),cur=Number(a.VAL),rec=VARS[n];
    if(!rec){_log("not watched:"+n);return false;}
    if(Math.abs(rec.v-cur)>1e-7){_ban('var '+n+' tampered: '+rec.v+'->'+cur);return true;}
    if(rec.h!==_h(n,cur)){_ban('var '+n+' checksum');return true;}
    return false;
  };

  IGE.prototype.tick=function(){
    _frame++;var now=Date.now();
    if(now<_lastWall)_ban("clock rollback");
    _lastWall=now;
  };

  IGE.prototype.isBanned=function(){return!!BANNED;};
  IGE.prototype.banReason=function(){return BAN_REASON;};
  IGE.prototype.forceBan=function(a){_ban(String(a.R||"manual"));};

  Scratch.extensions.register(new IGE());
})(Scratch);
