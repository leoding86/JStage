/**
 * 元素脚本
 * @param {string} property
 * @param {mixed} value 变化值，不是目标值
 * @param {mixed} duration
 * @param {string} timingFunction
 * @param {int} delay 毫秒单位
 */
var Script = function(property, value, duration, delay, timingFunction) {
    this.transforms = ['scaleX', 'scaleY', 'skewX', 'skewY', 'rotate', 'translateX', 'translateY'];

    this.id = Script.i++;
    this.property = property;
    this.value = value;
    this.duration = this.normalizeTime(duration);
    this.timingFunction = !!timingFunction ? timingFunction : 'linear';
    this.delay = this.normalizeTime(delay);
    this.status = Script.IDLE;
};

Script.i = 0;
Script.IDLE = 0;
Script.EXECUTING = 1;
Script.SKIP = 2;
Script.COMPLETE = 3;

Script.prototype = {
    reset: function() {
        this.status = Script.IDLE;
    },

    executing: function() {
        this.status = Script.EXECUTING;
    },

    skip: function() {
        this.status = Script.SKIP;
    },

    complete: function() {
        this.status = Script.COMPLETE;
    },

    isExecuting: function() {
        return this.status === Script.EXECUTING;
    },

    isSkip: function() {
        return this.status === Script.SKIP;
    },

    isComplete: function() {
        return this.status === Script.COMPLETE;
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

export default Script;