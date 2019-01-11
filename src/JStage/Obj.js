JStage.Obj = function(el, width, height, left, top) {
    this.el, // dom对象
    this.state = {},
    this.intermediateState = {} // 中间状态
    this.setups = {}, // 动画状态
    this.loops = {},
    this.propDiff = {},
    this.executingScripts = {},
    this.currentSetup,

    this.width,
    this.height,
    this.left,
    this.top,
    this.duration = 0;
    this.stage,
    this.status = JStage.Obj.IS_STATIC,

    this.setEl(el);
    this.setSize(width, height);
    this.setPosition(left, top);
}

JStage.Obj.PROP_DEFAULT = {
    scale   : 1,
    scaleX  : 1,
    scaleY  : 1,
    translateX  : 0,
    translateY  : 0,
    rotate  : 0,
    skew    : 0,
    skewX   : 0,
    skewY   : 0
};
JStage.Obj.TRANSFORMS = [
    'translateX',
    'translateY',
    'rotate',
    'skew',
    'skewX',
    'skewY',
    'scale',
    'scaleX',
    'scaleY',
];
JStage.Obj.INIT_SETUP = 'INIT_SETUP'; // 初始化状态
JStage.Obj.OPEN_SETUP = 'OPEN_SETUP'; // 开场状态
JStage.Obj.IS_IDLE = 0;
JStage.Obj.IS_COMPLETED = 2;
JStage.Obj.IS_ANIMATING = 3;
JStage.Obj.IS_STATIC = 4;

JStage.Obj.addBatchSetups = function(objs, setups) {
    objs.forEach(function(obj) {
        for (var offset in setups) {
            obj.addSetup(offset, setups[offset]);
        }
    });
}

JStage.Obj.prototype = {
    setState: function(prop, value) {
        this.state[prop] = value;
        return this;
    },

    /**
     *
     * @param {string} prop
     */
    getPropDefaultValue: function(prop) {
        if (undefined === JStage.Obj.PROP_DEFAULT[prop]) {
            return 0;
        } else {
            return JStage.Obj.PROP_DEFAULT[prop];
        }
    },

    createSetup: function(offset) {
        if (undefined === this.getSetup(offset)) {
            this.setups[offset] = {
                key: offset,
                scripts: [],
                setups: [],
                index: 0,
                startTimestamp: null
            }
        }
    },

    /**
     * 添加状态脚本
     * @param {string} offset
     * @param {array} scripts
     */
    addSetup: function(offset, scripts) {
        this.createSetup(offset);

        var setup = this.getSetup(offset);

        if (scripts instanceof Array && scripts.length > 0) {
            scripts.forEach(function(script) {
                this.addScript(offset, script)
            }, this);
        }

        setup.duration = this.getDuration(setup);

        return this;
    },

    /**
     *
     * @param {object} setups
     */
    addSetups: function(setups) {
        for (var offset in setups) {
            this.addSetup(offset, setups[offset]);
        }
    },

    addLoopSetup: function(offset, setupOffsets) {
        this.createSetup(offset);

        setupOffsets.forEach(function(setupOffset) {
            var setup = this.getSetup(setupOffset);

            if (setup) {
                this.getSetup(offset).setups.push(setup);
            }
        }, this);
    },

    addOpenSetup: function(scripts) {
        this.addSetup(JStage.Obj.OPEN_SETUP, scripts);
        return this;
    },

    /**
     * 为状态添加一个脚本
     * @param {string} offset
     * @param {object} script
     */
    addScript: function(offset, script) {
        this.createSetup(offset);

        this.status = JStage.Obj.IS_IDLE;

        this.setups[offset].scripts.push(
            new JStage.Script(script.property, script.value, script.duration, script.delay, script.timingFunction)
        );

        return this;
    },

    /**
     *
     * @param {string} offset
     */
    getSetup: function(offset) {
        return this.setups[offset];
    },

    getPropValue: function(state, prop) {
        return (undefined === state[prop]) ? this.getPropDefaultValue(prop) : state[prop];
    },

    getPropDiffVal: function(prop, from, to) {
        if (prop.toLowerCase().indexOf('color') > -1) {
            throw 'unsupported property ' + prop;
        }

        return to - from;
    },

    createPropDiff: function(script) {
        var prop = script.property;
        var toValue;

        if (typeof script.value === 'string' &&
            (script.value.indexOf('+') === 0 ||
            script.value.indexOf('-') === 0)
        ) {
            toValue = this.getPropValue(this.state, prop) + parseInt(script.value)
        } else {
            toValue = script.value;
        }

        this.propDiff[script.property] = {
            prop: prop,
            diffVal: this.getPropDiffVal(
                script.property,
                this.getPropValue(this.state, prop),
                toValue
            ),
            fromVal: this.getPropValue(this.state, prop)
        };
    },

    patchPropDiff: function(propDiff, script) {
        var prop = script.property;
        var toValue;

        if (typeof script.value === 'string' &&
            (script.value.indexOf('+') === 0 ||
            script.value.indexOf('-') === 0)
        ) {
            toValue = this.getPropValue(this.intermediateState, prop) + parseInt(script.value);
        } else {
            toValue = script.value;
        }

        propDiff.diffVal = this.getPropDiffVal(
            script.property,
            this.getPropValue(this.intermediateState, prop),
            toValue
        );
        propDiff.fromVal = this.getPropValue(this.intermediateState, prop);
    },

    getPropDiff: function(offset) {
        return this.propDiff[offset];
    },

    /**
     *
     * @param {object} propDIff
     * @param {float} progress
     */
    updateIntermediateState: function(propDiff, progress) {
        this.intermediateState[propDiff.prop] = progress * propDiff.diffVal + propDiff.fromVal;
    },

    update: function(setupOffset) {
        this.render(setupOffset === undefined ? JStage.Obj.OPEN_SETUP : setupOffset);
    },

    stop: function(setupOffset) {
        this.complete();

        var setup = this.getSetup(setupOffset);

        if (setup.setups.length > 0) {
            setup.index = 0;
        }
    },

    render: function() {
        var setup = this.currentSetup;

        if (!setup) {
            return;
        }

        if (setup.setups.length > 0) {
            var loopSetup = setup.setups[setup.index];
            // loop

            if (!loopSetup.startTimestamp) {
                loopSetup.startTimestamp = !!performance ? performance.now() : Date.now();
            }

            var startTimestamp;
            var currentTimestamp = this.getCurrentTimestamp();
            var scripts = loopSetup.scripts;
            var complete;

            scripts.forEach(function(script) {
                if (script.isComplete() || script.isSkip()) {
                    return;
                }

                startTimestamp = loopSetup.startTimestamp;

                complete = false;

                if (script.delay > 0) {
                    startTimestamp += script.delay;
                }

                if (startTimestamp > currentTimestamp) {
                    return;
                }

                var progress = (currentTimestamp - startTimestamp) / script.duration;

                if (progress > 1) {
                    progress = 1;
                }

                script.executing();

                if (undefined === this.executingScripts[script.property]) {
                    this.executingScripts[script.property] = script;
                    // create prop diff
                    this.createPropDiff(script);
                }

                if (this.executingScripts[script.property] !== script &&
                    !(script.isSkip() || script.isComplete())
                ) {
                    if (this.executingScripts[script.property].isExecuting()) {
                        this.executingScripts[script.property].skip();
                    }

                    this.executingScripts[script.property] = script;
                    // patch prop diff
                    this.patchPropDiff(this.getPropDiff(script.property), script);
                }

                this.updateIntermediateState(this.getPropDiff(script.property), progress);

                if (progress === 1) {
                    script.complete();
                }
            }, this);

            if (complete !== false) {
                loopSetup.startTimestamp = null;

                if (setup.index >= (setup.setups.length - 1)) {
                    setup.index = 0;
                } else {
                    setup.index++;
                }

                this.standbyLoop(setup);
            }
        } else {
            if (!setup.startTimestamp) {
                setup.startTimestamp = this.getStartTimestamp();
            }

            var startTimestamp;
            var currentTimestamp = this.getCurrentTimestamp();
            var scripts = setup.scripts;
            var complete;

            scripts.forEach(function(script) {
                if (script.isComplete() || script.isSkip()) {
                    return;
                }

                startTimestamp = setup.startTimestamp;

                complete = false;

                if (script.delay > 0) {
                    startTimestamp += script.delay;
                }

                if (startTimestamp > currentTimestamp) {
                    return;
                }

                var progress = (currentTimestamp - startTimestamp) / script.duration;

                if (progress > 1) {
                    progress = 1;
                }

                script.executing();

                if (undefined === this.executingScripts[script.property]) {
                    this.executingScripts[script.property] = script;
                    // create prop diff
                    this.createPropDiff(script);
                }

                if (this.executingScripts[script.property] !== script &&
                    !(script.isSkip() || script.isComplete())
                ) {
                    if (this.executingScripts[script.property].isExecuting()) {
                        this.executingScripts[script.property].skip();
                    }

                    this.executingScripts[script.property] = script;
                    // patch prop diff
                    this.patchPropDiff(this.getPropDiff(script.property), script);
                }

                this.updateIntermediateState(this.getPropDiff(script.property), progress);

                if (progress === 1) {
                    script.complete();
                }
            }, this);

            if (complete === false) {
                this.status = JStage.Obj.IS_ANIMATING;
            } else {
                this.status = JStage.Obj.IS_COMPLETED;
                setup.startTimestamp = null;
            }
        }

        this.renderState();
    },

    renderState: function() {
        var transformStyle = '';

        for (var prop in this.intermediateState) {
            if (JStage.Obj.TRANSFORMS.indexOf(prop) > -1) {
                switch (prop) {
                    case 'translateX':
                    case 'translateY':
                        transformStyle += prop + '(' + this.intermediateState[prop] + this.getScale() + 'px) ';
                        break;
                    case 'rotate':
                    case 'skew':
                    case 'skewX':
                    case 'skewY':
                        transformStyle += prop + '(' + this.intermediateState[prop] + 'deg) ';
                        break;
                    case 'scale':
                    case 'scaleX':
                    case 'scaleY':
                        transformStyle += prop + '(' + this.intermediateState[prop] + ') ';
                        break;
                }
            } else {
                if (['left', 'top', 'width', 'height'].indexOf(prop) > -1) {
                    this.el.style[prop] = this.intermediateState[prop] * this.getScale() + 'px';
                } else {
                    this.el.style[prop] = this.intermediateState[prop];
                }
            }
        }

        if (undefined !== transformStyle) {
            this.el.style.transform = transformStyle;
        }
    },

    /**
     * 设置物体尺寸
     * @param {int} width
     * @param {int} height
     * @returns {this}
     */
    setSize: function(width, height) {
        this.width = width;
        this.height = height;

        this.setState('width', width)
            .setState('height', height);

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

        this.setState('left', left)
            .setState('top', top);

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
     * Get the object ready, placing and style it.
     */
    getReady: function() {
        var openSetup = this.getSetup(JStage.Obj.OPEN_SETUP);

        if (undefined !== openSetup) {
            this.resetSetup(openSetup);
            this.duration = this.getDuration(openSetup);
        }

        // 重置中间状态
        this.intermediateState = {};

        // 初始化元素样式状态，包括当前状态以及阶段状态
        for (var prop in this.state) {
            this.intermediateState[prop] = this.state[prop];
        }

        this.renderState();
    },

    /**
     * 
     * @param {*} setupOffset 
     */
    getSetupReady: function(setupOffset) {
        // 重置中间状态
        this.intermediateState = {};

        var setup = this.getSetup(setupOffset);
        var finState = this.getFinState(setup);

        for (var prop in setup.scripts) {
            if (undefined === finState[prop]) {
                finState[prop] = setup.scripts[prop];
            }
        }

        for (var prop in finState) {
            this.intermediateState[prop] = finState[prop];
        }

        this.duration = this.getDuration(setup);
        this.renderState();
    },

    /**
     * Set object dom
     * @param {mixed} el 
     */
    setEl: function(el) {
        this.el = JStage.getEl(el);
    },

    /**
     * Check if the object is animating
     * @returns {boolean}
     */
    isAnimating: function() {
        return this.status === JStage.Obj.IS_ANIMATING;
    },

    /**
     * Check if the object's animation is complete
     * @returns {boolean}
     */
    isCompleted: function() {
        return this.status === JStage.Obj.IS_COMPLETED;
    },

    /**
     * Set object animation is completed.
     */
    complete: function() {
        this.status = JStage.Obj.IS_COMPLETED;
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
            this.renderState();
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

    /**
     * 重置舞台元素状态
     */
    reset: function() {
        this.getReady();
    },

    /**
     * 设置舞台播放到指定毫秒数
     * @param {int} time 舞台播放到指定毫秒数
     */
    setTime: function(time) {
        //
    },

    /**
     * 获得动画时间，这个时间包含延迟时间
     * @param {object} setup
     * @returns {int}
     */
    getDuration: function(setup) {
        var duration = 0;
        var scriptDuration = 0;

        setup.scripts.forEach(function(script) {
            scriptDuration = script.duration + script.delay;

            if (duration < scriptDuration) {
                duration = scriptDuration;
            }
        });

        return duration;
    },

    /**
     * 获得设置的最终状态，需要处理同属性延迟执行的情况，比如两个left移动先后执行
     * @param {object} setup
     */
    getFinState: function(setup) {
        var finState = {};
        var propDelay = {};

        setup.scripts.forEach(function(script) {
            if (undefined === propDelay[script.property]) {
                propDelay[script.property] = script.delay;
                finState[script.property] = script.property;
            } else if (script.delay > propDelay[script.property]) {
                propDelay[script.property] = script.delay;
                finState[script.property] = script.property;
            }
        });

        return finState;
    },

    /**
     * Reset setup status, include scripts in the setup
     * @param {object} setup
     */
    resetSetup: function(setup) {
        setup.scripts.forEach(function(script) {
            /**
             * Reset script status
             */
            script.reset();
        });
    },

    /**
     * Get the setup ready
     * @param {Object|string} offset 
     */
    standby: function(offset) {
        var setup = typeof offset === 'object' ? offset : this.getSetup(offset);

        if (undefined === setup) {
            return;
        }

        /**
         * If the setup is a loop setup, should get the setups in this ready
         */
        if (setup.setups.length > 0) {
            setup.setups.forEach(function(loopSetup) {
                this.standby(loopSetup);
            }, this);
        }

        this.currentSetup = setup;
        setup.startTimestamp = null;
        this.status = JStage.Obj.IS_IDLE;
        this.resetSetup(setup);
    },

    /**
     * Get the setup in side the loop ready
     * @param {Object} setup Loop setup
     */
    standbyLoop: function(setup) {
        this.standby(setup.setups[setup.index]);

        // Override current setup to current loop setup
        this.currentSetup = setup;
    },

    /**
     * Check if object has specified setup
     * @param {string} offset 
     */
    hasSetup: function(offset) {
        return undefined !== this.setups[offset];
    }
};