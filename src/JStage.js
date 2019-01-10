/**
 * 舞台构造函数
 * @constructor
 * @param {int} el
 * @param {int} width 舞台的标准宽度，不是元素的实际宽度
 * @param {int} height 舞台的标准高度，不是元素的实际高度
 */
function JStage(el, width, height) {
    this.el = JStage.getEl(el);
    this.width = width,
    this.height = height,
    this.scale,
    this.startTimestamp,
    this.currentTimestamp,
    this.duration = 0,
    this.status = JStage.IS_IDLE,
    this.currentSetupOffset,
    this.resources = [];
    this.objs = [];
}

JStage.getEl = function(el) {
    if (typeof el === 'string') {
        return document.querySelector(el);
    } else if (el instanceof jQuery) {
        return el[0];
    } else if (typeof el === 'object' &&
        (el instanceof Node && el.nodeType > 0)
    ) {
        return el;
    } else {
        throw 'Invalid el';
    }
};

JStage.normalizeTime = function(time) {
    if (!time) {
        return 0;
    }

    if (time.indexOf('ms') > 0) {
        return time.slice(0, -2) - 0;
    } else if (time.indexOf('s') > 0) {
        return time.slice(0, -1) * 1000;
    } else if (isNaN(time)) {
        throw 'Invalid time';
    }
};

JStage.getStyle = function(el, prop) {
    if (typeof getComputedStyle === undefined) {
        return el.currentStyle[prop];
    } else {
        return getComputedStyle(el, null).getPropertyValue(prop);
    }
};

JStage.IS_IDLE = 0;
JStage.IS_FINISHED = 1;

JStage.prototype = {
    /**
     * 添加资源
     * @param {string} resource
     */
    addResource: function(resource) {
        if (this.resources.indexOf(resource) < 0) {
            this.resources.push(resource);
        }

        return this;
    },

    loadResources: function(callbacks) {
        var self = this;
        var len = this.resources.length;
        var loadedLen = 0;

        this.resources.forEach(function(resource) {
            var image = new Image;
            image.onload = function() {
                console.log('image load')
                loadedLen++;

                if (callbacks.onProgress && typeof callbacks.onProgress === 'function') {
                    callbacks.onProgress.call(this, len, loadedLen);
                }

                if (loadedLen === len && callbacks.onComplete && typeof callbacks.onComplete === 'function') {
                    callbacks.onComplete.call(null);
                }
            }

            image.src = resource;

            if (image.complete) {
                image.load();
            }
        });
    },

    /**
     * 在舞台上创建一个物体
     * @param {mixed} el 元素对象
     * @param {int} width
     * @param {int} height
     * @param {int} left
     * @param {int} right
     * @returns {JStage.Obj}
     */
    createObj: function(el, width, height, left, right) {
        var obj = new JStage.Obj(el, width, height, left, right);
        this.appendObj(obj);
        return obj;
    },

    /**
     * 初始化舞台
     */
    init: function() {
        var self = this;

        this.setScale(this.el.offsetWidth, this.el.offsetHeight);

        this.el.style.width = this.width * this.scale + 'px';
        this.el.style.height = this.height * this.scale + 'px';

        // 将舞台元素准备到位
        this.objs.forEach(function(obj) {
            obj.getReady();

            if (obj.duration > self.duration) {
                self.duration = obj.duration;
            }
        });
    },

    standby: function(setupOffset) {
        this.startTimestamp = null;
        this.currentTimestamp = null;

        this.objs.forEach(function(obj) {
            obj.standby(setupOffset);
        }, this);
    },

    /**
     * 重置舞台元素实际尺寸
     * @param {int|float} width
     * @param {int|float} height
     */
    resizeEl: function(width, height) {
        this.setScale(width, height)

        // 设置舞台元素的尺寸
        this.el.style.width = this.width * this.scale + 'px';
        this.el.style.height = this.height * this.scale + 'px';

        this.objs.forEach(function(obj) {
            obj.recal();
        });
    },

    /**
     * 设置舞台的缩放比例
     * @param {int|float} width 舞台元素实际宽度
     * @param {int|float} height 舞台元素实际宽度
     */
    setScale: function(width, height) {
        var wScale = width / this.width;
        var hScale = height / this.height;

        if (wScale > hScale) {
            this.scale = hScale;
        } else {
            this.scale = wScale;
        }

        return this;
    },

    start: function() {
        this.startSetup(JStage.Obj.OPEN_SETUP);
    },

    startSetup: function(setupOffset) {
        this.currentSetupOffset = setupOffset;
        this.standby(setupOffset);

        if (!!window.requestAnimationFrame) {
            window.requestAnimationFrame(this.update.bind(this));
            return;
        }

        this.objs.forEach(function(obj) {
            if (!obj.isStatic()) {
                obj.setProgress(1);
            }
        });
    },

    update: function(timestamp) {
        if (!this.startTimestamp) {
            this.startTimestamp = timestamp;
        }

        this.currentTimestamp = timestamp;

        var finished;

        for (var i = 0, l = this.objs.length; i < l; i++) {
            var obj = this.objs[i];

            if (obj.hasSetup(this.currentSetupOffset) &&
                !(obj.isStatic() || obj.isCompleted())
            ) {
                finished = false;
                obj.update(this.currentSetupOffset);
            }
        }

        // 动画没有结束则继续执行
        if (finished === false) {
            window.requestAnimationFrame(this.update.bind(this));
        }
    },

    setTime: function(time) {
        for (var i = 0, l = this.objs.length; i < l; i++) {
            if (!this.objs[i].isStatic()) {
                this.objs[i].setTime(time);
            }
        }
    },

    setProgress: function(progress) {
        var time = this.duration * progress;
        this.setTime(time);
    },

    /**
     * 往舞台上添加物体
     * @param {JShow.Obj} obj
     */
    appendObj: function(obj) {
        if (!obj.stage && obj.stage !== this) {
            this.objs.push(obj);
            obj.setStage(this);
        }
    }
};