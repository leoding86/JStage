import Obj from './Obj';
import Effect from './Effect';

/**
 * 舞台构造函数
 * @constructor
 * @param {int} el
 * @param {int} width 舞台的标准宽度，不是元素的实际宽度
 * @param {int} height 舞台的标准高度，不是元素的实际高度
 */
function JStage(el, width, height) {
    if (!JStage.createFromStatic) {
        throw 'You should use JStage.createStage() method to create stage'
    }

    /**
     * Reset for next calling
     */
    JStage.createFromStatic = false;

    this.el = JStage.getEl(el);
    this.width = width,
    this.height = height,
    this.scale,
    this.startTimestamp,
    this.currentTimestamp,
    this.duration = 0,
    this.status = JStage.STATUS_IDLE,
    this.currentSetupOffsets = [],
    this.loops = [],
    this.resources = [],
    this.objs = [];
}

JStage.createFromStatic = false;
JStage.interval = 13;
JStage.inProgress = false;
JStage.stages = [];
JStage.STATUS_IDLE = 0;
JStage.STATUS_IN_PROGRESS = 1;
JStage.STATUS_COMPLETE = 2;

JStage.now = function() {
    if (performance && performance.now) {
        return performance.now();
    } else {
        return Date.now();
    }
};

JStage.setStyle = function(node, property, value) {
    var prefixs = ['ms', 'webkit', 'moz'];

    if (node.style[property] !== undefined) {
        node.style[property] = value;
    } else {
        var propertyName;
        property = property.charAt(0).toUpperCase() + property.slice(1);

        for (var i = 0, l = prefixs.length; i < l; i++) {
            propertyName = prefixs[i] + property;

            if (node.style[propertyName] !== undefined) {
                node.style[propertyName] = value;
                break;
            }
        }
    }
};

JStage.getEl = function(el) {
    if (typeof el === 'string') {
        if (document.querySelector) {
            return document.querySelector(el);
        } else if (el.indexOf('#') === 0) {
            return document.getElementById(el.slice(1));
        } else {
            throw 'el should be a string if it\'s not a Node';
        }
    } else if (jQuery && el instanceof jQuery) {
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

    if (typeof time === 'number') {
        return time;
    } else if (time.indexOf('ms') > 0) {
        return time.slice(0, -2) - 0;
    } else if (time.indexOf('s') > 0) {
        return time.slice(0, -1) * 1000;
    } else if (isNaN(time)) {
        return time;
    }
};

JStage.getStyle = function(el, prop) {
    if (typeof getComputedStyle === undefined) {
        return el.currentStyle[prop];
    } else {
        return getComputedStyle(el, null).getPropertyValue(prop);
    }
};

/**
 * Static method for creating a stage and you should use this to create stage,
 * because JStage will maintain a array of stages.
 * @param {mixed} el
 * @param {int} width
 * @param {int} height
 */
JStage.create = function(el, width, height) {
    JStage.createFromStatic = true;

    var stage = new JStage(el, width, height);
    JStage.stages.push(stage);

    return stage;
};

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
        var len = this.resources.length;
        var loadedLen = 0;

        this.resources.forEach(function(resource) {
            var image = new Image;
            image.onload = function() {
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
     * @returns {Obj}
     */
    createObj: function(el, width, height, left, right) {
        var obj = new Obj(el, width, height, left, right);
        this.appendObj(obj);
        return obj;
    },

    inProgress: function() {
        return this.status === JStage.STATUS_IN_PROGRESS;
    },

    isComplete: function() {
        return this.status === JStage.STATUS_COMPLETE;
    },

    isIdle: function() {
        return this.status === JStage.STATUS_IDLE;
    },

    inSetup: function(setupOffset) {
        return this.currentSetupOffsets.indexOf(setupOffset) > -1;
    },

    addCurrentSetupOffset: function(setupOffset) {
        if (this.currentSetupOffsets.indexOf(setupOffset) < 0) {
            this.currentSetupOffsets.push(setupOffset);
        }
    },

    removeFromCurrentSetups: function(setupOffset) {
        var index = this.currentSetupOffsets.indexOf(setupOffset);

        if (index > -1) {
            this.currentSetupOffsets.splice(index, 1);
        }
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

    /**
     * Prepare for starting setup
     * @param {string} setupOffset
     */
    standby: function(setupOffset) {
        this.startTimestamp = null;
        this.currentTimestamp = null;
        this.status = JStage.STATUS_IDLE;

        if (undefined === setupOffset) {
            return;
        }

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
        this.startSetup(Obj.OPEN_SETUP);
    },

    startSetup: function(setupOffset) {
        if (this.inSetup(setupOffset)) {
            return;
        }

        this.addCurrentSetupOffset(setupOffset);
        this.standby(setupOffset);

        this.startTimestamp = JStage.now();

        Effect.start();

        // if (!this.isAnimating()) {
        //     this.status = JStage.IS_ANIMATING;

        //     if (window.requestAnimationFrame) {
        //         window.requestAnimationFrame(this.update.bind(this));
        //     } else {
        //         setTimeout(this.update.bind(this), JStage.interval);
        //     }
        // }
    },

    stopSetup: function(offset) {
        this.objs.forEach(function(obj) {
            if (obj.hasSetup(offset)) {
                obj.stop(offset);
            }
        });
    },

    /**
     * Called from Effect.update method for updating stage
     * @param {float} timestamp
     */
    update: function(timestamp) {
        if (this.isComplete()) {
            return false;
        }

        this.updateSetup(timestamp);
        return true;
    },

    updateSetup: function(timestamp) {
        this.currentTimestamp = timestamp;

        if (this.currentSetupOffsets.length > 0) {
            this.status = JStage.STATUS_IN_PROGRESS;

            this.currentSetupOffsets.forEach(function(setupOffset) {
                var finished;

                this.objs.forEach(function(obj) {
                    if (obj.update(setupOffset)) {
                        finished = false;
                    }
                }, this);

                if (finished === undefined) {
                    this.removeFromCurrentSetups(setupOffset);
                }
            }, this);
        } else {
            this.status = JStage.STATUS_COMPLETE;
        }
    },

    setTime: function(time) {
        //
    },

    setProgress: function(progress) {
        //
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

export default JStage;