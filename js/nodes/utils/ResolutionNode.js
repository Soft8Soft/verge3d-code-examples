/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ResolutionNode = function(renderer) {

    v3d.Vector2Node.call(this);

    this.requestUpdate = true;

    this.renderer = renderer;

};

v3d.ResolutionNode.prototype = Object.create(v3d.Vector2Node.prototype);
v3d.ResolutionNode.prototype.constructor = v3d.ResolutionNode;

v3d.ResolutionNode.prototype.updateFrame = function(delta) {

    var size = this.renderer.getSize(),
        pixelRatio = this.renderer.getPixelRatio();

    this.x = size.width * pixelRatio;
    this.y = size.height * pixelRatio;

};
