v3d.MirrorNode = function(mirror, camera, options) {

    v3d.TempNode.call(this, 'v4');

    this.mirror = mirror;

    this.textureMatrix = new v3d.Matrix4Node(this.mirror.material.uniforms.textureMatrix.value);

    this.worldPosition = new v3d.PositionNode(v3d.PositionNode.WORLD);

    this.coord = new v3d.OperatorNode(this.textureMatrix, this.worldPosition, v3d.OperatorNode.MUL);
    this.coordResult = new v3d.OperatorNode(null, this.coord, v3d.OperatorNode.ADD);

    this.texture = new v3d.TextureNode(this.mirror.material.uniforms.mirrorSampler.value, this.coord, null, true);

};

v3d.MirrorNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.MirrorNode.prototype.constructor = v3d.MirrorNode;

v3d.MirrorNode.prototype.generate = function(builder, output) {

    var material = builder.material;

    if (builder.isShader('fragment')) {

        this.coordResult.a = this.offset;
        this.texture.coord = this.offset ? this.coordResult : this.coord;

        if (output === 'sampler2D') {

            return this.texture.build(builder, output);

        }

        return builder.format(this.texture.build(builder, this.type), this.type, output);

    } else {

        console.warn("v3d.MirrorNode is not compatible with " + builder.shader + " shader.");

        return builder.format('vec4(0.0)', this.type, output);

    }

};
