/*
 *  Project:
 *  Description: h5转场插件
 *  Author: Yinghua Shi
 *  License:
 */
;
(function($, window, undefined) {
  var pluginName = 'PagesBox',
    pluginName_lower = 'pagesBox',
    document = window.document,
    methodHandler = ["destroy", "goPage", "goStep", "goNext", "goPrev", "goPresent", "offTouch", "onTouch"],
    defaults = {
      speed: 200,
      axis: 'y', //转场方向
      pages: 'li',
      scrollPage: false, //没有写false，有写class
      unTouchedPages: false, //不能滑动的页
      threshold: 50, //变页的门槛值px值
      fromScrollToOther: true, //scroll页可以到其他页吗
      swipeMaxTime: 500, //swipe事件的临界时间,ms
      swipeBaseTime: 500, //计算局利用
      scrollSwipe: true, //是否支持scrollSwipe事件
      scrollSwipeGap: 50,
      loop: false, //是否可以从最后一页到第一页
      easing: 'cubic-bezier(0,.84,1,.22)',
      hash: false //启动hash功能
    };

  function Plugin(element, options) {
    this.options = $.extend({}, defaults, options);
    this.ul = $(element);
    this.pages = this.ul.children();
    this.length = this.pages.length;
    this.axis = this.options.axis;
    this.changed = false;
    if (this.length === 0) return false;
    if (this.options.scrollPage) {
      this.scrollPage = this.ul.find(this.options.scrollPage);
      this.scrollIndex = this.scrollPage.index();
    }
    if (this.options.unTouchedPages) {
      this.unTouchedPages = this.ul.find(this.options.unTouchedPages);
    }
    this._initPx();
    this.page = 0; //当前显示的页码
    this.prePage = 0;
    this.started = false;
    this.moved = false;
    this.animating = false;
    this.startPos = {};
    this.movePos = {};
    this.endPos = {};
    this.trans = {};
    this.startTrans = {};
    this.init();
  }

  Plugin.prototype._initPx = function() {
    this.unitHeight = this.axis === 'y' ? parseInt(document.documentElement.clientHeight) : parseInt(document.documentElement.clientWidth);
    //this.unitHeight = this.axis === 'y' ? this.pages.eq(0).height() : this.pages.eq(0).width(); 
    this.scrollHeight = !this.options.scrollPage ? 0 : (this.axis === 'y' ? this.scrollPage.height() : this.scrollPage.width());
    this.height = this.unitHeight * (this.length - 1) + this.scrollHeight;
    if (this.axis === 'y') {
      this.pages.css({
        height: this.unitHeight
      });
      //alert(this.unitHeight)
      if (this.options.scrollPage) {
        this.scrollPage.css({
          height: this.scrollHeight
        });
      }
      this.ul.css({
        height: this.height
      });
    } else {
      this.pages.css({
        width: this.unitHeight
      });
      if (this.options.scrollPage) {
        this.scrollPage.css({
          width: this.scrollHeight
        });
      }
      this.ul.css({
        width: this.height
      });
    }
    this._initPageArr();
  };

  Plugin.prototype._initPageArr = function() {
    var h = 0,
      pageH = 0,
      that = this,
      index;
    this.pageArr = [];
    for (var i = 0; i < this.pages.length; i++) {
      pageH = this.axis === 'y' ? this.pages.eq(i)[0].clientHeight : this.pages.eq(i)[0].clientWidth;
      this.pageArr.push([-h, -h - pageH + 1]);
      h += pageH;
    }
    this.scrollTransArr = [];
    if (this.options.scrollPage) {
      this.scrollTransArr = [this.pageArr[this.scrollIndex][0], this.pageArr[this.scrollIndex][1] + this.unitHeight];
    }
    this.unTouchedArr = [];
    if (this.options.unTouchedPages) {
      this.unTouchedPages.each(function() {
        index = $(this).index();
        that.unTouchedArr.push(that.pageArr[index][0]);
      });
    }
  }

  Plugin.prototype.init = function() {
    var that = this;
    //this.ul.addClass('switchpages-trans');
    this._setTransform(0);
    //绑定tuchstart事件
    document.addEventListener('touchstart', function(e) {
      that._touchstart.call(that, e)
    }, false);
    //绑定tuchmove事件
    document.addEventListener('touchmove', function(e) {
      that._touchmove.call(that, e)
    }, false);
    //绑定tuchend事件
    document.addEventListener('touchend', function(e) {
      that._touchend.call(that, e)
    }, false);
    //绑定webkitTransitionEnd事件
    this.ul[0].addEventListener('webkitTransitionEnd', function(e) {
      //this.started = false; 
      that._transitionend.call(that, e);
      that.ul.trigger('transend', that.page);
    }, false);
    var orientchange = function(e) {
      setTimeout(function() {
        that._initPx();
        that.goStep(that.pageArr[that.page][0]);
      }, 300);
    }
    window.addEventListener("orientationchange", orientchange, false);
    if (this.options.hash) {
      var hash = parseInt(location.hash.substring(1));
      hash = isNaN(hash) ? 0 : hash;
      this.page = hash;
      this.goStep(this.pageArr[hash][0]);
    }
  };

  Plugin.prototype._touchstart = function(e) {
    var that = this,
      ev = e.changedTouches[0],
      arrTrans = [];
    this.started = false;
    this.removeTrans();
    this.startPos = {
      x: ev.pageX,
      y: ev.pageY
    };
    this.startTrans = this._getTrans();
    if (this.options.unTouchedPages && this.unTouchedArr.indexOf(this.startTrans[this.axis]) > -1) {
      //e.stopPropagation();
      return false;
    }
    this.started = true;
    this.moved = false;
    this.startTime = e.timeStamp;
  };

  Plugin.prototype._touchmove = function(e) {
    if (!this.started) return;
    this.moved = true;
    e.preventDefault();
    var ev = e.changedTouches[0];
    this.movePos = {
      x: ev.pageX,
      y: ev.pageY
    }
    this.moveTime = e.timeStamp;
    if (!this.options.loop) {
      if (this.startTrans[this.axis] === this.pageArr[0][0] && this.movePos[this.axis] > this.startPos[this.axis]) {
        return; //第一页，不能上拉
      }
      if (this.scrollPage && this.scrollIndex === this.length - 1) { //scroll页是最后一页
        if (this.startTrans[this.axis] === this.scrollTransArr[1] && this.movePos[this.axis] < this.startPos[this.axis]) { //到达最后一页，底部不能下拉
          return;
        }
        if (this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis] > this.pageArr[this.length - 1][1]) {
          this.goStep(this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis]);
        }
      }
    }
    if (this.options.scrollPage && this.startTrans[this.axis] <= this.scrollTransArr[0] && this.startTrans[this.axis] >= this.scrollTransArr[1] && !this.fromScrollToOthers) { //超长页且不能到别的页
      if (this.movePos[this.axis] > this.startPos[this.axis]) { //上
        if (this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis] > this.scrollTransArr[0]) {
          return;
        }
      } else if (this.movePos[this.axis] < this.startPos[this.axis]) { //下
        if (this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis] < this.scrollTransArr[1]) {
          return;
        }
      }
    }
    if (this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis] > this.pageArr[this.length - 1][0]) {
      this.goStep(this.startTrans[this.axis] + this.movePos[this.axis] - this.startPos[this.axis]);
    }
  };

  Plugin.prototype._touchend = function(e) {
    var ev = e.changedTouches[0],
      margin0 = 0,
      margin1 = 0,
      step, endstep;
    if (this.options.scrollPage) {
      margin0 = this.scrollTransArr[0];
      margin1 = this.scrollTransArr[1];
    }
    this.endPos = {
      x: ev.pageX,
      y: ev.pageY
    };
    if (!this.started || this.endPos[this.axis] == this.startPos[this.axis]) { //没有移动
      //event.preventDefault();
      return;
    }
    //e.preventDefault(); 
    this.trans = this._getTrans();
    this.endTime = e.timeStamp;
    //e.stopPropagation();

    if (this.endPos[this.axis] < this.startPos[this.axis]) { //向下滚屏，一般情况出下一页
      if (!this.options.scrollPage) { //只有一般页
        if (Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) >= this.options.threshold) {
          this.goNext();
        } else {
          this.goPresent();
        }
      } else { //存在超长页
        if (!this.options.fromScrollToOther && this.startTrans[this.axis] === margin1) { //如果现在在超长页页尾，不能进入别的页
          //this.goScrollBot(); 
        } else if (this.scrollIndex === this.length - 1 && this.startTrans[this.axis] === margin1) { //超长页为最后一页，在页尾
          if (this.options.loop) { //循环
            this.goNext();
          } else { //不动
            return;
          }
        } else if (this.startTrans[this.axis] > margin0 || this.startTrans[this.axis] < margin1) { //现在在一般页
          if (Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) >= this.options.threshold) {
            this.goNext();
          } else {
            this.goPresent();
          }
          return;
        } else if (this.startTrans[this.axis] === margin1) { //到达scroll页的下边界，下一页
          this.goNext();
        } else { //超长页面区域
          step = this.startTrans[this.axis] + this.endPos[this.axis] - this.startPos[this.axis];

          var distance = Math.abs(this.endPos[this.axis] - this.startPos[this.axis]);
          var timediff = this.endTime - this.startTime;
          if (!this.options.scrollSwipe || timediff >= this.options.swipeMaxTime) { //大于0.5秒，只挪动相应距离，无滑动
            endstep = Math.max(step, margin1);
          } else {
            endstep = Math.max(step - distance * this.scrollHeight / this.unitHeight * (this.options.swipeBaseTime - timediff) / this.options.swipeMaxTime, margin1);
            this.ul.css('-webkit-transition', 'all ' + (this.options.swipeBaseTime) / 1000 + 's ease-out;');
          }
          /*
          if (this.options.scrollSwipe && this.endTime - this.startTime < this.options.swipeMaxTime && Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) > this.options.scrollSwipeGap) { //快速滑动
            endstep = Math.max(this.startTrans[this.axis] - this.unitHeight, margin1);
            this.ul.css('-webkit-transition', 'all ' + this.options.speed / 1000 * (Math.abs(endstep - this.startTrans[this.axis])) / this.unitHeight + 's ' + this.options.easing + ';');
          } else {
            endstep = Math.max(step, margin1);
          }
          */
          step = endstep;
          this.goStep(step);
        }
      }
    } else { //向上滚屏
      if (!this.options.scrollPage) { //只有一般页
        if (Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) >= this.options.threshold) {
          this.goPrev();
        } else {
          this.goPresent();
        }
      } else { //存在超长页
        if (!this.options.fromScrollToOther && this.startTrans[this.axis] === margin0) { //如果现在在超长页页头，且不能进入别的页
          //this.goScrollTop(); 
        } else if (this.startTrans[this.axis] > margin0 || this.startTrans[this.axis] < margin1) { //
          if (Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) >= this.options.threshold) {
            this.goPrev();
          } else {
            this.goPresent();
          }
          return;
        } else if (this.startTrans[this.axis] === margin0) { //到达scroll页的上边界，上一页
          this.goPrev();
        } else { //超长页面区域
          step = this.startTrans[this.axis] + this.endPos[this.axis] - this.startPos[this.axis];

          var distance = Math.abs(this.endPos[this.axis] - this.startPos[this.axis]);
          var timediff = this.endTime - this.startTime;
          if (!this.options.scrollSwipe || timediff >= this.options.swipeMaxTime) { //大于0.5秒，只挪动相应距离，无滑动
            endstep = Math.min(step, margin0);
          } else {
            endstep = Math.min(step + distance * this.scrollHeight / this.unitHeight * (this.options.swipeBaseTime - timediff) / this.options.swipeMaxTime, margin0);
            this.ul.css('-webkit-transition', 'all ' + (this.options.swipeBaseTime) / 1000 + 's ease-out;');
          }

          /*
          if (this.options.scrollSwipe && this.endTime - this.startTime < this.options.swipeMaxTime && Math.abs(this.endPos[this.axis] - this.startPos[this.axis]) > this.options.scrollSwipeGap) { //快速滑动
            endstep = Math.min(this.startTrans[this.axis] + this.unitHeight, margin0);
            this.ul.css('-webkit-transition', 'all ' + this.options.speed / 1000 * (Math.abs(endstep - this.startTrans[this.axis])) / this.unitHeight + 's ' + this.options.easing + ';');
          } else {
            endstep = Math.min(step, margin0);
          }
          */
          step = endstep;
          this.goStep(step);
        }
      }
    }
  };

  Plugin.prototype._getPageIndex = function(h) {
    if (h < this.pageArr[0]) return -1;
    for (var i = 0; i < this.pageArr.length; i++) {
      if (h <= this.pageArr[i][1] && h >= this.pageArr[i][0]) return i;
    }
    return i;
  };

  Plugin.prototype._getTrans = function() {
    var transformStr = this.ul[0].style.webkitTransform || '',
      arrTrans = transformStr.match(/translate3d\((.*)\)/),
      arr;
    if (!arrTrans || arrTrans.length == 0) {
      this.ul[0].style.webkitTransform = 'translate3d(0,0,0)';
      arr = [0, 0, 0];
    } else {
      arr = arrTrans[1].split(',');
    }
    return {
      x: parseInt(arr[0], 10),
      y: parseInt(arr[1], 10)
    }
  };
  Plugin.prototype._transitionend = function(e) {
    var that = this;
    this.animating = false;
    //history.pushState({},"","#"+this.page);
    this.options.transEndCb && this.options.transEndCb.call(that, that.page);
  }
  Plugin.prototype.getAxis = function() {
    return this.options.axis;
  }
  Plugin.prototype.goStep = function(step) {
    this.trans[this.axis] = step;
    this._setTransform(step);
  };

  Plugin.prototype._setTransform = function(step) {
    if (this.axis === 'y') {
      this.ul[0].style.webkitTransform = 'translate3d(0,' + step + 'px,0)';
    } else {
      this.ul[0].style.webkitTransform = 'translate3d(' + step + 'px,0,0)';
    }
  };
  /*
  Plugin.prototype._getHash (url) {//用于取得当前窗口或iframe窗口的hash值
    url = url || location.href
    return '#' + url.replace( /^[^#]*#?(.*)$/, '$1' );
  };
  Plugin.prototype._getURl (url) {//用于取得当前窗口或iframe窗口的hash值
    url = url || location.href
    return url.replace( /^[^#]*#?(.*)$/, '' );
  };*/
  Plugin.prototype.goPage = function(to, from) {
    this.page = to;
    this.options.hash && (location.hash = '#' + to);
    if (typeof from == 'undefined') {
      from = this.page;
    }
    if (this.options.scrollPage) {
      if (to === this.scrollIndex && from === this.scrollIndex + 1) {
        this.goScrollBot();
        this.ul.trigger('gopage', [to, from]);
        return;
      }
    }
    this.addTrans();
    var newMargin = 0;
    if (to >= this.pageArr.length) {
      to = from;
    } else if (to < 0) {
      to = 0;
    }
    newMargin = this.pageArr[to][0];
    this._setTransform(newMargin);
    this.animating = true;
    this.ul.trigger('gopage', [to, from]);
  };

  Plugin.prototype.goNext = function() {
    var index = this.page;
    if (index === this.pageArr.length - 1) {
      if (this.options.loop) {
        index = 0;
      }
    } else {
      index++;
    }
    this.goPage(index, this.page);
  };

  Plugin.prototype.goPresent = function() {
    this.goPage(this.page, this.page);
  };

  Plugin.prototype.offTouch = function() {
    $(document).off('touchstart');
    //绑定tuchmove事件
    $(document).off('touchmove');
    //绑定tuchend事件
    $(document).off('touchend');
  }

  Plugin.prototype.onTouch = function() {
    this.offTouch();
    var that = this;
    $(document).on('touchstart', function(e) {
      that._touchstart.call(that, e)
    });
    //绑定tuchmove事件
    $(document).on('touchmove', function(e) {
      that._touchmove.call(that, e)
    });
    //绑定tuchend事件
    $(document).on('touchend', function(e) {
      that._touchend.call(that, e)
    });
  }

  Plugin.prototype.goScrollBot = function() {
    this.addTrans();
    var newMargin = 0;
    this.page = this.scrollIndex;
    newMargin = this.scrollTransArr[1];
    this._setTransform(newMargin);
  };

  Plugin.prototype.goScrollTop = function() {
    this.addTrans();
    var newMargin = this.scrollTransArr[0];
    this._setTransform(newMargin);
  };

  Plugin.prototype.goPrev = function() {
    var index = this.page;
    if (index !== 0) {
      index--;
    }
    this.goPage(index, this.page);
  };

  Plugin.prototype.addTrans = function() {
    this.ul.css('-webkit-transition', 'all ' + this.options.speed / 1000 + 's ' + this.options.easing + ';');
  };

  Plugin.prototype.removeTrans = function() {
    this.ul.css('-webkit-transition', 'all 0 linear');
  };

  $.fn[pluginName] = $.fn[pluginName_lower] = function(options) {
    if (typeof options == 'string') {
      var args = arguments,
        method = options,
        isHandler = function() {
          for (var i = 0; i < methodHandler.length; i++) {
            if (methodHandler[i] === method) return true;
          }
          return false;
        };
      Array.prototype.shift.call(args);
      if (method == 'check') {
        return !!this.data('plugin_' + pluginName);
      } else if (isHandler()) {
        return this.each(function() {
          var _plugin = $(this).data('plugin_' + pluginName);
          if (_plugin && _plugin[method]) _plugin[method].apply(_plugin, args);
        });
      } else {
        throw new TypeError(pluginName + ' has no method "' + method + '"');
      }
    } else {
      return this.each(function() {
        var _plugin = $(this).data('plugin_' + pluginName);
        if (!_plugin) {
          $(this).data('plugin_' + pluginName, new Plugin(this, options));
        }
      });
    }
  };

}($, window));