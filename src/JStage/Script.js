/**
 * 元素脚本
 * @param {string} property
 * @param {mixed} value 变化值，不是目标值
 * @param {mixed} duration
 * @param {string} timingFunction
 * @param {int} delay 毫秒单位
 */
JStage.Script = function(property, value, duration, timingFunction, delay) {
    this.transforms = ['scaleX', 'scaleY', 'skewX', 'skewY', 'rotate', 'translateX', 'translateY'];

    this.property = property;
    this.value = value;
    this.duration = this.normalizeTime(duration);
    this.timingFunction = !!timingFunction ? timingFunction : 'linear';
    this.delay = this.normalizeTime(delay);
    this.isCompleted = false;
};

JStage.Script.prototype = {
    completed: function() {
        this.isCompleted = true;
    },

    isTransform: function() {
        return this.transforms.indexOf(this.property) > -1;
    },

    getTransitionStyle: function() {
        return this.property + ' ' + this.duration + 'ms ' + this.timingFunction + ' ' + this.delay + 'ms';
    },

    normalizeTime: function(time) {
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
    },

    /**
     * 根据运行进度来计算脚本当前进度的值
     * @param {float} progress
     */
    getProgressValue: function(progress) {
        return progress * this.value;
    }
};