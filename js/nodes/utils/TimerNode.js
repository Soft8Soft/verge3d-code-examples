/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.TimerNode = function(value, scale) {

    v3d.FloatNode.call(this, value);

    this.requestUpdate = true;

    this.scale = scale !== undefined ? scale : 1;

};

v3d.TimerNode.prototype = Object.create(v3d.FloatNode.prototype);
v3d.TimerNode.prototype.constructor = v3d.TimerNode;

v3d.TimerNode.prototype.updateFrame = function(delta) {

    this.number += delta * this.scale;

};
