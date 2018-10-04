/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.UVTransformNode = function() {

    v3d.FunctionNode.call(this, "(uvTransform * vec4(uvNode, 0, 1)).xy", "vec2");

    this.uv = new v3d.UVNode();
    this.transform = new v3d.Matrix4Node();

};

v3d.UVTransformNode.prototype = Object.create(v3d.FunctionNode.prototype);
v3d.UVTransformNode.prototype.constructor = v3d.UVTransformNode;

v3d.UVTransformNode.prototype.generate = function(builder, output) {

    this.keywords["uvNode"] = this.uv;
    this.keywords["uvTransform"] = this.transform;

    return v3d.FunctionNode.prototype.generate.call(this, builder, output);

};

v3d.UVTransformNode.prototype.compose = function() {

    var defaultPivot = new v3d.Vector2(.5, .5),
        tempVector = new v3d.Vector3(),
        tempMatrix = new v3d.Matrix4();

    return function compose(translate, rotate, scale, optionalCenter) {

        optionalCenter = optionalCenter !== undefined ? optionalCenter : defaultPivot;

        var matrix = this.transform.value;

        matrix.identity()
            .setPosition(tempVector.set(- optionalCenter.x, - optionalCenter.y, 0))
            .premultiply(tempMatrix.makeRotationZ(rotate))
            .multiply(tempMatrix.makeScale(scale.x, scale.y, 0))
            .multiply(tempMatrix.makeTranslation(translate.x, translate.y, 0));

        return this;

    };

}();
