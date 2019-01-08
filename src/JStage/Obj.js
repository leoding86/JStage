JStage.Obj = function(el, width, height, left, top) {
    this.el,
    this.width,
    this.height,
    this.left,
    this.top,
    this.duration = 0;
    this.transform = {
        scaleX: 1,
        scaleY: 1,
    },
    this.transformState = {}, // transform中间状态
    this.transformPrevState = {}, // transform 上一阶段完成状态
    this.style = {
        opacity: 1,
    },
    this.styleState = {}, // style 中间状态
    this.stylePrevState = {}, // style 上一阶段完成状态
    this.stage,
    this.prevObj,
    this.status = JStage.Obj.IS_STATIC,
    this.scripts = [];

    this.setEl(el);
    this.setSize(width, height);
    this.setPosition(left, top);
}

JStage.Obj.IS_IDLE = 0;
JStage.Obj.IS_COMPLETED = 2;
JStage.Obj.IS_ANIMATING = 3;
JStage.Obj.IS_STATIC = 4;

JStage.Obj.prototype = {
    /**
     * 设置物体尺寸
     * @param {int} width
     * @param {int} height
     * @returns {this}
     */
    setSize: function(width, height) {
        this.width = width;
        this.height = height;

        this.setStyle('width', width)
            .setStyle('height', height);

        return this;
    },

    /**
     * 设置物体位置
     * @param {int} left
     * @param {int} top
     * @returns {this}
     */
    setPosition: function(left, top) {
        this.left = left;
        this.top = top;

        this.setStyle('left', left)
            .setStyle('top', top);

        return this;
    },

    /**
     * 设置物体变化
     * @param {string} func
     * @param {int} value
     */
    setTransform: function(func, value) {
        this.transform[func] = value;
        return this;
    },

    /**
     * 设置舞台元素的样式
     * @param {string} property 
     * @param {mixed} value 
     * @param {this}
     */
    setStyle: function(property, value) {
        this.style[property] = value;
        return this;
    },

    /**
     * 设置物体的动画脚本
     * @param {array} scripts
     * @returns {this}
     */
    setScripts: function(scripts) {
        this.scripts = scripts;
    },

    /**
     * 添加单个脚本
     * @param {string} property
     * @param {mixed} value
     * @param {mixed} duration
     * @param {string} timingFunction
     * @param {mixed} delay
     */
    addScript: function(property, value, duration, timingFunction, delay) {
        if (this.isStatic()) {
            this.status = JStage.Obj.IS_IDLE;
        }

        this.scripts.push(new JStage.Script(property, value, duration, timingFunction, delay));
        return this;
    },

    /**
     * 获得当前元素的缩放比例
     * @returns {float}
     */
    getScale: function() {
        return this.stage.scale;
    },

    /**
     * 获得当前舞台的开始时间戳
     * @returns {float}
     */
    getStartTimestamp: function() {
        return this.stage.startTimestamp;
    },

    /**
     * 获得当前舞台的当前时间戳
     * @returns {float}
     */
    getCurrentTimestamp: function() {
        return this.stage.currentTimestamp;
    },

    /**
     * 将舞台元素准备好
     */
    getReady: function() {
        // 初始化元素样式状态，包括当前状态以及阶段状态
        for (var prop in this.style) {
            this.stylePrevState[prop] = this.style[prop];
            this.styleState[prop] = this.style[prop];
        }

        // 初始化元素变换状态，包括当前状态以及阶段状态
        for (var func in this.transform) {
            this.transformPrevState[func] = this.transform[func];
            this.transformState[func] = this.transform[func];
        }

        this.duration = this.getDuration();
        this.renderStyle(this.styleState);
        this.renderTransform(this.transformState);
    },

    /**
     * 设置元素层尺寸
     * @deprecated
     * @returns {this}
     */
    setElSize: function() {
        this.setElWidth(this.width)
            .setElHeight(this.height);
        return this;
    },

    /**
     * 设置元素层宽度
     * @deprecated
     * @param {int} width
     * @returns {this}
     */
    setElWidth: function(width) {
        this.el.style.width = width * this.getScale() + 'px';
        return this;
    },

    /**
     * 设置元素层高度
     * @deprecated
     * @param {int} height
     * @returns {this}
     */
    setElHeight: function(height) {
        this.el.style.height = height * this.getScale() + 'px';
        return this;
    },

    /**
     * @deprecated
     * @returns {this}
     */
    setElPosition: function() {
        this.setElLeft(this.left)
            .setElTop(this.top);
        return this;
    },

    /**
     * @deprecated
     * @param {int|float} left
     * @returns {this} 
     */
    setElLeft: function(left) {
        this.el.style.left = left * this.getScale() + 'px';
        return this;
    },

    /**
     * @deprecated
     * @param {int|float} top
     * @returns {this} 
     */
    setElTop: function(top) {
        this.el.style.top = top * this.getScale() + 'px';
        return this;
    },

    /**
     * @deprecated
     * @returns {this}
     */
    setElStyle: function() {
        this.renderStyle(this.style);
        return this;
    },

    /**
     * @deprecated
     * @returns {this}
     */
    setElTransform: function() {
        this.renderTransform(this.transform);
        return this;
    },

    setEl: function(el) {
        this.el = JStage.getEl(el);

        if (['absolute'].indexOf(this.el.style.position) < 0) {
            console.warn('Stage object position style should be \'absolute\'');
        }
    },

    /**
     * 判断元素是否正在执行动画
     * @returns {boolean}
     */
    isAnimating: function() {
        return this.status === JStage.Obj.IS_ANIMATING;
    },

    /**
     * 判断元素动画是否已经完成
     * @returns {boolean}
     */
    isCompleted: function() {
        return this.status === JStage.Obj.IS_COMPLETED;
    },

    /**
     * 判断元素是否是静止元素
     * @returns {boolean}
     */
    isStatic: function() {
        return this.status === JStage.Obj.IS_STATIC;
    },

    /**
     * 判断元素是否是等待动画执行状态
     * @returns {boolean}
     */
    isIdle: function() {
        return this.status === JStage.Obj.IS_IDLE;
    },

    /**
     * 重计算部分脚本
     * 主要用于更新场景大小变化后元素的各种尺寸和位置相关属性
     */
    recal: function() {
        if (!this.isAnimating()) {
            this.renderStyle(this.styleState);
            this.renderTransform(this.transformState);
        }
    },

    /**
     * 将物体添加到指定的舞台上
     * @param {JStage.Stage} stage
     */
    appendToStage: function(stage) {
        stage.appendObj(this);
    },

    /**
     * 设置物体到指定的舞台上
     * @param {JStage.setStage} stage
     */
    setStage: function(stage) {
        this.stage = stage;
    },

    render: function() {
        var self = this;
        var completed = true;

        this.scripts.forEach(function(script) {
            // 如果动画已完成则不继续
            if (!script.isCompleted) {
                completed = false;
                var startTimestamp = self.getStartTimestamp();

                // 如果配有达到延迟时间则不继续
                if (script.delay > 0) {
                    startTimestamp += script.delay;

                    if (startTimestamp >= self.getCurrentTimestamp()) {
                        return;
                    }
                }

                // 需要考虑时间精度跳跃问题
                var progress = (self.getCurrentTimestamp() - startTimestamp) / script.duration;

                // 如果已超过动画执行时间，标记脚本结束并执行最后一次progress = 1
                if (progress > 1) {
                    script.completed();
                    progress = 1;
                }
                
                self.updateState(script, progress);
            }
        });

        this.renderStyle(this.styleState);
        this.renderTransform(this.transformState);

        this.status = !!completed ? JStage.Obj.IS_COMPLETED : JStage.Obj.IS_ANIMATING;
    },

    /**
     * 重置舞台元素状态
     */
    reset: function() {
        this.getReady();
    },

    /**
     * 设置舞台播放到指定毫秒数
     * @param {float} time 舞台播放到指定毫秒数
     */
    setTime: function(time) {
        // 重置元素
        this.reset();

        var self = this;
        
        this.scripts.forEach(function(script) {
            var startTimestamp = 0;

            // 如果配有达到延迟时间则不继续
            if (script.delay > 0) {
                startTimestamp = script.delay;

                if (startTimestamp >= time) {
                    return;
                }
            }

            // 需要考虑时间精度跳跃问题
            var progress = (time - startTimestamp) / script.duration;

            // 如果已超过动画执行时间，标记脚本结束并执行最后一次progress = 1
            if (progress > 1) {
                progress = 1;
            }

            self.updateState(script, progress);
        });

        this.renderStyle(this.styleState);
        this.renderTransform(this.transformState);
    },

    /**
     * 获得动画时间，这个时间包含延迟时间
     * @returns {int}
     */
    getDuration: function() {
        var duration = 0;
        
        this.scripts.forEach(function(script) {
            var scriptDuration = script.delay + script.duration;
            
            if (scriptDuration > duration) {
                duration = scriptDuration;
            }
        });

        return duration;
    },

    /**
     * 更新舞台元素的状态
     * @param {JStage.Script} script 
     * @param {float} progress 
     */
    updateState: function(script, progress) {
        if (script.isTransform()) {
            this.transformState[script.property] = (
                !this.transformPrevState[script.property] ? 0 : this.transformPrevState[script.property]
            ) - 0 + script.getProgressValue(progress);

            // 保存阶段性属性
            if (progress === 1) {
                this.transformPrevState[script.property] = this.transformState[script.property];
            }
        } else {
            this.styleState[script.property] = (
                !this.stylePrevState[script.property] ? 0 : this.stylePrevState[script.property]
            ) - 0 + script.getProgressValue(progress);

            // 保存阶段性属性
            if (progress === 1) {
                this.stylePrevState[script.property] = this.styleState[script.property];
            }
        }
    },

    renderStyle: function(style) {
        for (var prop in style) {
            if (['left', 'top', 'width', 'height'].indexOf(prop) > -1) {
                this.el.style[prop] = style[prop] * this.getScale() + 'px';
            } else {
                this.el.style[prop] = style[prop];
            }
        }
    },

    renderTransform: function(transform) {
        var transformStyle = '';

        for (var i in transform) {
            switch (i) {
                case 'translateX':
                case 'translateY':
                    transformStyle += i + '(' + transform[i] + this.getScale() + 'px) ';
                    break;
                case 'rotate':
                case 'skewX':
                case 'skewY':
                    transformStyle += i + '(' + transform[i] + 'deg) ';
                    break;
                case 'scaleX':
                case 'scaleY':
                    transformStyle += i + '(' + transform[i] + ') ';
                    break;
            }
        }

        if (!!transformStyle) {
            this.el.style.transform = transformStyle;
        }
    }
};