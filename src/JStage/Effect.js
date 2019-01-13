import JStage from './JStage';

var Effect = {
    start: function() {
        if (!JStage.inProgress) {
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(Effect.update);
            } else {
                setTimeout(Effect.update, JStage.interval);
            }
        }
    },

    update: function(timestamp) {
        JStage.inProgress = true;

        JStage.stages.forEach(function(stage) {
            stage.objs.forEach(function(obj) {
                stage.currentTimestamp = timestamp ? timestamp : JStage.now();
                stage.updateSetup(timestamp);
            });
        });

        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(Effect.update)
        } else {
            setTimeout(this.update, JStage.interval);
        }
    }
}
