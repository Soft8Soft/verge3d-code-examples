/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.NormalMapNode = function(value, uv, scale, normal, position) {

    v3d.TempNode.call(this, 'v3');

    this.value = value;
    this.scale = scale || new v3d.FloatNode(1);

    this.normal = normal || new v3d.NormalNode(v3d.NormalNode.LOCAL);
    this.position = position || new v3d.PositionNode(v3d.NormalNode.VIEW);

};

v3d.NormalMapNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.NormalMapNode.prototype.constructor = v3d.NormalMapNode;

v3d.NormalMapNode.prototype.generate = function(builder, output) {

    var material = builder.material;

    builder.include('perturbNormal2Arb');

    if (builder.isShader('fragment')) {

        return builder.format('perturbNormal2Arb(-' + this.position.build(builder, 'v3') + ',' +
            this.normal.build(builder, 'v3') + ',' +
            this.value.build(builder, 'v3') + ',' +
            this.value.coord.build(builder, 'v2') + ',' +
            this.scale.build(builder, 'v2') + ')', this.getType(builder), output);

    } else {

        console.warn("v3d.NormalMapNode is not compatible with " + builder.shader + " shader.");

        return builder.format('vec3(0.0)', this.getType(builder), output);

    }

};
