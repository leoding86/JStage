/**
 * 元素脚本
 * @param {string} property
 * @param {mixed} value 变化值，不是目标值
 * @param {mixed} duration
 * @param {string} timingFunction
 * @param {int} delay 毫秒单位
 */
JStage.Script = function(property, value, duration, delay, timingFunction) {
    this.transforms = ['scaleX', 'scaleY', 'skewX', 'skewY', 'rotate', 'translateX', 'translateY'];

    this.id = JStage.Script.i++;
    this.property = property;
    this.value = value;
    this.duration = this.normalizeTime(duration);
    this.timingFunction = !!timingFunction ? timingFunction : 'linear';
    this.delay = this.normalizeTime(delay);
    this.status = JStage.Script.IDLE;
};

JStage.Script.i = 0;
JStage.Script.IDLE = 0;
JStage.Script.EXECUTING = 1;
JStage.Script.SKIP = 2;
JStage.Script.COMPLETE = 3;

JStage.Script.prototype = {
    reset: function() {
        this.status = JStage.Script.IDLE;
    },

    executing: function() {
        this.status = JStage.Script.EXECUTING;
    },

    skip: function() {
        this.status = JStage.Script.SKIP;
    },

    complete: function() {
        this.status = JStage.Script.COMPLETE;
    },

    isExecuting: function() {
        return this.status === JStage.Script.EXECUTING;
    },

    isSkip: function() {
        return this.status === JStage.Script.SKIP;
    },

    isComplete: function() {
        return this.status === JStage.Script.COMPLETE;
    },

    normalizeTime: function(time) {
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
    },

    /**
     * 根据运行进度来计算脚本当前进度的值
     * @param {float} progress
     */
    getProgressValue: function(progress) {
        return progress * this.value;
    }
};