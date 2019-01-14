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
        var timestamp = timestamp ? timestamp : JStage.now();

        JStage.inProgress = true;

        JStage.stages.forEach(function(stage) {
            stage.update(timestamp);
        });

        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(Effect.update)
        } else {
            setTimeout(Effect.update, JStage.interval);
        }
    }
}

export default Effect;
