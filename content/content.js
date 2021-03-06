var hide = {
  cash: false,
  cashNum: 3,
  telegram: false,
  debug: false,
  count: 0,
  allTimeCount: 0
}


function actionEls(els, unhide) {
  var newCount = els.length;
  if (els.length) {
    for (el of els) {
      if (hide.debug) {
        el.style['background-color'] = '#00a2f0'
        el.classList.add('hide-elements-now');
      } else {
        
        el.style.display = 'none';
        el.classList.add('hide-elements-now');
      }
    }
  } 
  if (!unhide) {
    hide.allTimeCount += newCount;
    hide.count += newCount;
    setKills();
    if (chrome && chrome.storage && chrome.storage.local && chrome.storage.local.set) {
      chrome.storage.local.set({allTimeCount: hide.allTimeCount, count: hide.count});
    }
  }
}

function setKillsRaw() {
  if (document.querySelector('.stream-footer .timeline-end.has-items .stream-end-inner')) {
    var killsEl = $('.shillkill-kills');
    if (!killsEl || killsEl.length<=0) {
      var o = document.createElement('span');
      o.className = 'shillkill-footer'
      o.innerHTML = 'Tweets Killed: '
      var i = document.createElement('span');
      i.className = 'shillkill-kills';
      i.innerHTML = " " + hide.count;
      i.style = 'color: #00a2f0'
      o.appendChild(i);
      o.style = 'float: right; position: absolute; top: 30%; right: 20px; font-size: 30px;'
      $('.stream-footer .timeline-end.has-items .stream-end-inner').css({position: 'relative'})
      $('.stream-footer .timeline-end.has-items .stream-end-inner').append(o)
    } else {
      killsEl.each(function(){
        killsEl.html(" " + hide.count);
      });
    }
  }
}

var setKills = _.throttle(setKillsRaw, 100);

function genDolRegex() {
  var reg = '\\$'
  var i;
  for (i=0;i<hide.cashNum;i++) {
    reg += '(.|[\\r\\n])*\\$';
  }
  return new RegExp(reg, 'gm');
}

function filterEls(dolReg, limitTextSearch) {
  return function (el) {
      var ret = false;
      var text = null;
      var textEl = el;
      if (limitTextSearch) {
        textEl = el.querySelector(limitTextSearch);
      }
      text = (textEl||{innerHTML: ''}).innerHTML;

      if (hide.cash && dolReg.test(text))
        ret = true ; 

      if (hide.telegram && /t\.me/gi.test(text))
        ret = true
      return ret;
    }
}
function doHidesRaw() {
  if (hide.init) {
    var dolReg = genDolRegex();
    
    let els = document.querySelectorAll(".js-stream-item:not(.hide-elements-now)");
    els = _.filter(els, filterEls(dolReg, '.js-tweet-text'));
    actionEls(els);   
  }
}
var doHides = doHidesRaw;//_.throttle(doHidesRaw, 50);
//var doHides = _.throttle(doHidesRaw, 20);

var forceReload = _.throttle(function() {
  if (!$('#search-query').is(':focus')) {
    $('.try-again-after-whale')[0].click()
  }
}, 100);


var doHideInit = _.throttle(function() {
  if (!hide.init) {
    $(window).scroll(function() {
      if (hide.cash || hide.telegram) {
        if((Math.ceil($(window).scrollTop()) + $(window).height()) >= ($(document).height())) {
          forceReload();
        }
      }
    });
    // Guarentee that we have at least 10 visible tweets
    function reloadIfNeeded() {
      let els = document.querySelectorAll(".js-stream-item:not(.hide-elements-now)")
     
        console.log()
      if (els && els.length<=20 && (hide.cash || hide.telegram)) {
        forceReload();
        //console.log("force reload", els);
        window.setTimeout(reloadIfNeeded, 1000);
      } else {
        //console.log("force reload-timeout");
        window.setTimeout(reloadIfNeeded, 1000);
      }
    }
    window.setTimeout(reloadIfNeeded, 300);
  }
  hide.init = true;
  doHides();
}, 100, {leading: false});

$(document).ready(function() {
  chrome.storage.local.set({count: 0});
  setTimeout(doHideInit(), 0);

  var observer = new MutationObserver(function(mutations) {
    doHides();
  });

  observer.observe(document, {
    attributes: true,
    childList: true, 
    characterData: true, 
    subtree:true
     //,attributeOldValue: true,
    //characterDataOldValue: true 
  });
  
  chrome.storage.local.get("cash", function(ret) {
    if (typeof ret.cash==='undefined') 
      hide.cash = true;
    else 
      hide.cash = !!ret.cash;
    doHideInit();
  })
  chrome.storage.local.get("telegram", function(ret) {
    if (typeof ret.telegram==='undefined') 
      hide.telegram = true;
    else 
      hide.telegram = !!ret.telegram;
    doHideInit();
  })
  chrome.storage.local.get("debug", function(ret) {
    hide.debug = !!ret.debug;
    doHideInit();
  });
  chrome.storage.local.get("cashNum", function(ret) {
    hide.cashNum = parseInt(ret.cashNum) || 3; 
    doHideInit();
  })


  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (typeof changes.cash!=='undefined')
      hide.cash = changes.cash.newValue; 
    if (typeof changes.telegram!=='undefined')
      hide.telegram = changes.telegram.newValue; 
    if (typeof changes.debug!=='undefined')
      hide.debug = changes.debug.newValue; 
    if (typeof changes.cashNum!=='undefined') 
      hide.cashNum = parseInt(changes.cashNum.newValue) || 3; 

    if (changes.cash && changes.cash.newValue!=changes.cash.oldValue
        || changes.cashNum && changes.cashNum.newValue!=changes.cashNum.oldValue
        || changes.telegram && changes.telegram.newValue!=changes.telegram.oldValue
        ) {
      location.reload();
      doHides();
    }
  });

});
